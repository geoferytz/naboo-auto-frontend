package com.naboo.automotive.vehicles;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Year;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.Money;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.storage.FileStorage;
import com.naboo.automotive.vehicles.VehicleInputs.AdminVehicleFilter;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleFilter;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleImageInput;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleInput;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleSort;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;
import com.naboo.automotive.vehicles.VehicleViews.StatusChangeView;
import com.naboo.automotive.vehicles.VehicleViews.VehicleView;

import jakarta.persistence.criteria.Predicate;

@Service
public class VehicleService {

    private static final int MAX_IMAGES = 30;

    private final VehicleRepository vehicles;
    private final VehicleStatusHistoryRepository history;
    private final AuditService audit;
    private final AppProperties properties;
    private final FileStorage storage;
    private final Clock clock = Clock.systemUTC();

    public VehicleService(VehicleRepository vehicles, VehicleStatusHistoryRepository history, AuditService audit,
            AppProperties properties, FileStorage storage) {
        this.storage = storage;
        this.vehicles = vehicles;
        this.history = history;
        this.audit = audit;
        this.properties = properties;
    }

    // ------------------------------------------------------------------ public

    @Transactional(readOnly = true)
    public PageView<VehicleView> searchPublic(VehicleFilter filter, Integer page, Integer size, VehicleSort sort) {
        VehicleFilter f = filter == null ? new VehicleFilter(null, null, null, null, null, null, null, null, null, null, null, null, null) : filter;
        BigDecimal minPrice = Money.parseAmount(f.minPrice(), "minPrice");
        BigDecimal maxPrice = Money.parseAmount(f.maxPrice(), "maxPrice");
        List<VehicleStatus> statuses = Boolean.TRUE.equals(f.includeSold())
                ? List.of(VehicleStatus.AVAILABLE, VehicleStatus.RESERVED, VehicleStatus.SOLD)
                : List.of(VehicleStatus.AVAILABLE, VehicleStatus.RESERVED);

        Specification<Vehicle> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.isTrue(root.get("published")));
            p.add(root.get("status").in(statuses));
            if (notBlank(f.search())) {
                String like = "%" + escapeLike(f.search().trim().toLowerCase(Locale.ROOT)) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("make")), like, '\\'), cb.like(cb.lower(root.get("model")), like, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.get("variant"), "")), like, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.get("location"), "")), like, '\\')));
            }
            if (notBlank(f.make())) {
                p.add(cb.equal(cb.lower(root.get("make")), f.make().trim().toLowerCase(Locale.ROOT)));
            }
            if (notBlank(f.model())) {
                p.add(cb.equal(cb.lower(root.get("model")), f.model().trim().toLowerCase(Locale.ROOT)));
            }
            if (f.minYear() != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("modelYear"), f.minYear()));
            }
            if (f.maxYear() != null) {
                p.add(cb.lessThanOrEqualTo(root.get("modelYear"), f.maxYear()));
            }
            if (minPrice != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("priceAmount"), minPrice));
            }
            if (maxPrice != null) {
                p.add(cb.lessThanOrEqualTo(root.get("priceAmount"), maxPrice));
            }
            if (f.maxMileageKm() != null) {
                p.add(cb.lessThanOrEqualTo(root.get("mileageKm"), f.maxMileageKm()));
            }
            if (f.fuelType() != null) {
                p.add(cb.equal(root.get("fuelType"), f.fuelType()));
            }
            if (f.transmission() != null) {
                p.add(cb.equal(root.get("transmission"), f.transmission()));
            }
            if (f.bodyType() != null) {
                p.add(cb.equal(root.get("bodyType"), f.bodyType()));
            }
            if (f.condition() != null) {
                p.add(cb.equal(root.get("condition"), f.condition()));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageView.of(vehicles.findAll(spec, PageView.request(page, size, sortOf(sort))), v -> VehicleView.of(v, false, null));
    }

    @Transactional(readOnly = true)
    public VehicleView findPublicBySlug(String slug) {
        return vehicles.findBySlug(slug).filter(Vehicle::isPubliclyVisible).map(v -> VehicleView.of(v, false, null)).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<String> publicMakes() {
        return vehicles.findPublicMakes(VehicleStatus.UNAVAILABLE);
    }

    @Transactional(readOnly = true)
    public List<com.naboo.automotive.common.VehicleSearchOption> searchOptions() {
        return vehicles.findSearchOptions(List.of(VehicleStatus.AVAILABLE, VehicleStatus.RESERVED));
    }

    // ------------------------------------------------------------------ staff

    @Transactional(readOnly = true)
    public PageView<VehicleView> searchAdmin(AdminVehicleFilter filter, Integer page, Integer size) {
        Specification<Vehicle> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (filter != null && notBlank(filter.search())) {
                String like = "%" + escapeLike(filter.search().trim().toLowerCase(Locale.ROOT)) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("make")), like, '\\'), cb.like(cb.lower(root.get("model")), like, '\\'),
                        cb.like(cb.lower(root.get("slug")), like, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.get("location"), "")), like, '\\'),
                        cb.like(cb.lower(cb.coalesce(root.get("registrationNumber"), "")), like, '\\')));
            }
            if (filter != null && filter.status() != null) {
                p.add(cb.equal(root.get("status"), filter.status()));
            }
            if (filter != null && filter.published() != null) {
                p.add(cb.equal(root.get("published"), filter.published()));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageView.of(vehicles.findAll(spec, PageView.request(page, size, Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("id")))),
                v -> VehicleView.of(v, true, null));
    }

    @Transactional(readOnly = true)
    public VehicleView getForStaff(UUID id) {
        return staffView(load(id));
    }

    @Transactional
    public VehicleView create(VehicleInput input, UUID actor) {
        validateYear(input.year());
        Vehicle vehicle = new Vehicle(uniqueSlug(input), properties.currency());
        vehicle.applyDetails(input, Money.parseAmount(input.priceAmount(), "priceAmount"));
        vehicles.saveAndFlush(vehicle);
        history.save(new VehicleStatusHistory(vehicle.getId(), null, vehicle.getStatus(), actor));
        audit.record(actor, "VEHICLE_CREATED", "Vehicle", vehicle.getId(), "price=" + vehicle.getPriceAmount());
        return staffView(vehicle);
    }

    @Transactional
    public VehicleView update(UUID id, VehicleInput input, UUID actor) {
        validateYear(input.year());
        Vehicle vehicle = load(id);
        BigDecimal oldPrice = vehicle.getPriceAmount();
        BigDecimal newPrice = Money.parseAmount(input.priceAmount(), "priceAmount");
        vehicle.applyDetails(input, newPrice);
        String details = oldPrice.compareTo(newPrice) != 0 ? "price " + oldPrice + " -> " + newPrice : null;
        audit.record(actor, "VEHICLE_UPDATED", "Vehicle", id, details);
        vehicles.flush();
        return staffView(vehicle);
    }

    @Transactional
    public VehicleView setStatus(UUID id, VehicleStatus status, UUID actor) {
        Vehicle vehicle = load(id);
        VehicleStatus previous = vehicle.changeStatus(status);
        if (previous != status) {
            history.save(new VehicleStatusHistory(id, previous, status, actor));
            audit.record(actor, "VEHICLE_STATUS_CHANGED", "Vehicle", id, previous + " -> " + status);
        }
        vehicles.flush();
        return staffView(vehicle);
    }

    @Transactional
    public VehicleView setPublished(UUID id, boolean published, UUID actor) {
        Vehicle vehicle = load(id);
        if (published && vehicle.getStatus() == VehicleStatus.UNAVAILABLE) {
            throw new BusinessRuleException("VEHICLE_UNAVAILABLE", "Unavailable vehicles cannot be published.");
        }
        if (vehicle.isPublished() != published) {
            vehicle.setPublished(published, clock.instant());
            audit.record(actor, published ? "VEHICLE_PUBLISHED" : "VEHICLE_UNPUBLISHED", "Vehicle", id, null);
        }
        vehicles.flush();
        return staffView(vehicle);
    }

    @Transactional
    public VehicleView addImage(UUID vehicleId, VehicleImageInput input, UUID actor) {
        Vehicle vehicle = load(vehicleId);
        String url = input.url().trim();
        if (!(url.startsWith("https://") || url.startsWith("/uploads/") || url.startsWith("/assets/"))) {
            throw new BusinessRuleException("INVALID_IMAGE_URL", "Image URL must use https or be a site-relative upload path.");
        }
        if (vehicle.getImages().size() >= MAX_IMAGES) {
            throw new BusinessRuleException("TOO_MANY_IMAGES", "A vehicle can have at most " + MAX_IMAGES + " images.");
        }
        int order = input.sortOrder() != null ? input.sortOrder() : vehicle.getImages().size();
        vehicle.getImages().add(new VehicleImage(vehicle, url, input.altText().trim(), order));
        audit.record(actor, "VEHICLE_IMAGE_ADDED", "Vehicle", vehicleId, url);
        vehicles.flush();
        return staffView(vehicle);
    }

    @Transactional
    public VehicleView removeImage(UUID vehicleId, UUID imageId, UUID actor) {
        Vehicle vehicle = load(vehicleId);
        VehicleImage image = vehicle.getImages().stream().filter(i -> i.getId().equals(imageId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Image not found."));
        vehicle.getImages().remove(image);
        storage.deletePublicAfterCommit(image.getUrl());
        audit.record(actor, "VEHICLE_IMAGE_REMOVED", "Vehicle", vehicleId, imageId.toString());
        vehicles.flush();
        return staffView(vehicle);
    }

    @Transactional
    public VehicleView reorderImages(UUID vehicleId, List<UUID> orderedIds, UUID actor) {
        Vehicle vehicle = load(vehicleId);
        List<UUID> current = vehicle.getImages().stream().map(VehicleImage::getId).toList();
        if (orderedIds.size() != current.size() || !orderedIds.containsAll(current)) {
            throw new BusinessRuleException("INVALID_IMAGE_ORDER", "Provide every image of this vehicle exactly once.");
        }
        vehicle.getImages().forEach(i -> i.setSortOrder(orderedIds.indexOf(i.getId())));
        vehicle.getImages().sort(java.util.Comparator.comparingInt(VehicleImage::getSortOrder));
        audit.record(actor, "VEHICLE_IMAGES_REORDERED", "Vehicle", vehicleId, null);
        vehicles.flush();
        return staffView(vehicle);
    }

    // ------------------------------------------------------------------ helpers

    private Vehicle load(UUID id) {
        return vehicles.findById(id).orElseThrow(() -> new NotFoundException("Vehicle not found."));
    }

    private VehicleView staffView(Vehicle vehicle) {
        List<StatusChangeView> changes = history.findByVehicleIdOrderByChangedAtDesc(vehicle.getId()).stream()
                .map(h -> new StatusChangeView(h.getFromStatus(), h.getToStatus(), h.getChangedAt())).toList();
        return VehicleView.of(vehicle, true, changes);
    }

    private void validateYear(int year) {
        int max = Year.now(ZoneId.of(properties.timezone())).getValue() + 1;
        if (year > max) {
            throw new BusinessRuleException("INVALID_YEAR", "Model year cannot be later than " + max + ".");
        }
    }

    private String uniqueSlug(VehicleInput input) {
        String base = Identifiers.slugify(input.year() + " " + input.make() + " " + input.model()
                + (input.variant() == null ? "" : " " + input.variant()));
        String slug = base;
        while (vehicles.existsBySlug(slug)) {
            slug = base + "-" + Identifiers.randomToken(5).toLowerCase(Locale.ROOT);
        }
        return slug;
    }

    private static Sort sortOf(VehicleSort sort) {
        Sort primary = switch (sort == null ? VehicleSort.NEWEST : sort) {
            case NEWEST -> Sort.by(Sort.Order.desc("publishedAt"));
            case PRICE_ASC -> Sort.by(Sort.Order.asc("priceAmount"));
            case PRICE_DESC -> Sort.by(Sort.Order.desc("priceAmount"));
            case YEAR_DESC -> Sort.by(Sort.Order.desc("modelYear"));
            case MILEAGE_ASC -> Sort.by(Sort.Order.asc("mileageKm").nullsLast());
        };
        return primary.and(Sort.by(Sort.Order.asc("id")));
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
