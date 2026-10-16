package com.naboo.automotive.rentals;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.Year;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthService;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.Money;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.notifications.Notification.NotificationType;
import com.naboo.automotive.notifications.NotificationService;
import com.naboo.automotive.rentals.RentalInputs.AdminRentalFilter;
import com.naboo.automotive.rentals.RentalInputs.RentalVehicleInput;
import com.naboo.automotive.rentals.RentalInputs.ReservationInput;
import com.naboo.automotive.rentals.RentalTypes.RentalVehicleStatus;
import com.naboo.automotive.rentals.RentalTypes.ReservationStatus;
import com.naboo.automotive.rentals.RentalViews.AvailabilityView;
import com.naboo.automotive.rentals.RentalViews.RentalVehicleView;
import com.naboo.automotive.rentals.RentalViews.ReservationView;
import com.naboo.automotive.storage.FileStorage;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleImageInput;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;

import jakarta.persistence.criteria.Predicate;

@Service
public class RentalService {

    private static final int MAX_IMAGES = 20;
    static final int MAX_RENTAL_DAYS = 60;
    static final int MAX_LEAD_DAYS = 180;

    private final RentalVehicleRepository vehicles;
    private final RentalReservationRepository reservations;
    private final CustomerRepository customers;
    private final AuditService audit;
    private final NotificationService notifications;
    private final AppProperties properties;
    private final FileStorage storage;
    private final Clock clock = Clock.systemUTC();

    public RentalService(RentalVehicleRepository vehicles, RentalReservationRepository reservations,
            CustomerRepository customers, AuditService audit, NotificationService notifications,
            AppProperties properties, FileStorage storage) {
        this.vehicles = vehicles;
        this.reservations = reservations;
        this.customers = customers;
        this.audit = audit;
        this.notifications = notifications;
        this.properties = properties;
        this.storage = storage;
    }

    private LocalDate today() {
        return LocalDate.now(ZoneId.of(properties.timezone()));
    }

    // ------------------------------------------------------------------ public catalogue

    @Transactional(readOnly = true)
    public PageView<RentalVehicleView> searchPublic(Integer page, Integer size) {
        Specification<RentalVehicle> spec = (root, q, cb) -> cb.and(cb.isTrue(root.get("published")),
                cb.equal(root.get("status"), RentalVehicleStatus.AVAILABLE));
        return PageView.of(
                vehicles.findAll(spec, PageView.request(page, size, Sort.by(Sort.Order.asc("dailyRateAmount"), Sort.Order.asc("id")))),
                v -> RentalVehicleView.of(v, false));
    }

    @Transactional(readOnly = true)
    public RentalVehicleView findPublicBySlug(String slug) {
        return vehicles.findBySlug(slug).filter(RentalVehicle::isPubliclyVisible).map(v -> RentalVehicleView.of(v, false))
                .orElse(null);
    }

    // ------------------------------------------------------------------ reservations

    /** Server-side availability check and price quote for [startDate, endDate). */
    @Transactional(readOnly = true)
    public AvailabilityView availability(UUID vehicleId, LocalDate start, LocalDate end) {
        RentalVehicle vehicle = vehicles.findById(vehicleId).orElseThrow(() -> new NotFoundException("Vehicle not found."));
        validateDates(start, end);
        boolean available = vehicle.isPubliclyVisible()
                && reservations.countBlockingOverlap(vehicleId, start, end) == 0;
        return new AvailabilityView(available, days(start, end), Money.of(vehicle.getDailyRateAmount(), vehicle.getCurrency()),
                Money.of(vehicle.getDailyRateAmount().multiply(BigDecimal.valueOf(days(start, end))), vehicle.getCurrency()));
    }

    @Transactional
    public EnquiryReceipt reserve(ReservationInput input, UUID userId) {
        RentalVehicle vehicle = vehicles.findById(input.rentalVehicleId()).filter(RentalVehicle::isPubliclyVisible)
                .orElseThrow(() -> new NotFoundException("Vehicle not found."));
        validateDates(input.startDate(), input.endDate());

        if (input.requestToken() != null) {
            var existing = reservations.findByRequestToken(input.requestToken());
            if (existing.isPresent()) {
                return receipt(existing.get(), true);
            }
        }

        int days = days(input.startDate(), input.endDate());
        BigDecimal total = vehicle.getDailyRateAmount().multiply(BigDecimal.valueOf(days));
        UUID customerId = userId == null ? null : customers.findByUserId(userId).map(Customer::getId).orElse(null);
        RentalReservation reservation = new RentalReservation(Identifiers.reference("RNT"), input.requestToken(), vehicle,
                customerId, input.fullName().trim(), AuthService.normaliseEmail(input.email()), input.phone().trim(),
                input.startDate(), input.endDate(), vehicle.getDailyRateAmount(), total, vehicle.getCurrency(),
                blankToNull(input.notes()));
        try {
            reservations.saveAndFlush(reservation);
        } catch (DataIntegrityViolationException e) {
            if (input.requestToken() != null) {
                var existing = reservations.findByRequestToken(input.requestToken());
                if (existing.isPresent()) {
                    return receipt(existing.get(), true);
                }
            }
            throw new BusinessRuleException("DATES_UNAVAILABLE",
                    "These dates are no longer available for this vehicle. Please choose different dates.");
        }
        audit.record(userId, "RENTAL_RESERVATION_CREATED", "RentalReservation", reservation.getId(),
                reservation.getReference() + " " + input.startDate() + ".." + input.endDate());
        return receipt(reservation, false);
    }

    private static EnquiryReceipt receipt(RentalReservation r, boolean duplicate) {
        return new EnquiryReceipt(r.getReference(), duplicate
                ? "This request was already submitted. Your reservation reference is unchanged."
                : "Reservation request received. Our rental team will confirm availability and contact you.");
    }

    @Transactional(readOnly = true)
    public PageView<ReservationView> myReservations(UUID userId, Integer page, Integer size) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId)
                .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        return PageView.of(reservations.findByCustomerIdOrderByCreatedAtDesc(customerId,
                PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt")))), ReservationView::of);
    }

    @Transactional
    public ReservationView cancelMine(UUID id, UUID userId) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId)
                .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        RentalReservation r = reservations.findById(id).orElseThrow(() -> new NotFoundException("Reservation not found."));
        if (!customerId.equals(r.getCustomerId())) {
            throw new NotFoundException("Reservation not found.");
        }
        if (!r.getStatus().isCustomerCancellable()) {
            throw new BusinessRuleException("CANNOT_CANCEL", "This reservation can no longer be cancelled online.");
        }
        r.transition(ReservationStatus.CANCELLED);
        audit.record(userId, "RENTAL_RESERVATION_CANCELLED", "RentalReservation", id, r.getReference());
        reservations.flush();
        return ReservationView.of(r);
    }

    // ------------------------------------------------------------------ staff: reservations

    @Transactional(readOnly = true)
    public PageView<ReservationView> listReservations(ReservationStatus status, Integer page, Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        var result = status == null ? reservations.findAll(request) : reservations.findByStatus(status, request);
        return PageView.of(result, ReservationView::of);
    }

    @Transactional
    public ReservationView updateReservation(UUID id, ReservationStatus status, UUID actor) {
        RentalReservation r = reservations.findById(id).orElseThrow(() -> new NotFoundException("Reservation not found."));
        ReservationStatus previous = r.getStatus();
        try {
            r.transition(status);
            reservations.flush();
        } catch (DataIntegrityViolationException e) {
            throw new BusinessRuleException("DATES_UNAVAILABLE",
                    "Cannot confirm: these dates now overlap another active reservation.");
        }
        if (previous != status) {
            audit.record(actor, "RENTAL_RESERVATION_UPDATED", "RentalReservation", id, previous + " -> " + status);
            notifications.notifyCustomer(r.getCustomerId(), NotificationType.RESERVATION_STATUS,
                    "Reservation " + r.getReference() + " " + status.name().replace('_', ' ').toLowerCase(),
                    notificationBody(r, status), "/my-account", "RentalReservation", id);
        }
        return ReservationView.of(r);
    }

    // ------------------------------------------------------------------ staff: fleet management

    @Transactional(readOnly = true)
    public PageView<RentalVehicleView> searchAdmin(AdminRentalFilter filter, Integer page, Integer size) {
        Specification<RentalVehicle> spec = (root, q, cb) -> {
            List<Predicate> p = new java.util.ArrayList<>();
            if (filter != null && notBlank(filter.search())) {
                String like = "%" + escapeLike(filter.search().trim().toLowerCase(Locale.ROOT)) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("make")), like, '\\'), cb.like(cb.lower(root.get("model")), like, '\\'),
                        cb.like(cb.lower(root.get("slug")), like, '\\'),
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
        return PageView.of(
                vehicles.findAll(spec, PageView.request(page, size, Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("id")))),
                v -> RentalVehicleView.of(v, true));
    }

    @Transactional(readOnly = true)
    public RentalVehicleView getForStaff(UUID id) {
        return RentalVehicleView.of(load(id), true);
    }

    @Transactional
    public RentalVehicleView create(RentalVehicleInput input, UUID actor) {
        validateYear(input.year());
        RentalVehicle vehicle = new RentalVehicle(uniqueSlug(input), properties.currency());
        vehicle.applyDetails(input, Money.parseAmount(input.dailyRateAmount(), "dailyRateAmount"),
                Money.parseAmount(input.depositAmount(), "depositAmount"));
        vehicles.saveAndFlush(vehicle);
        audit.record(actor, "RENTAL_VEHICLE_CREATED", "RentalVehicle", vehicle.getId(), null);
        return RentalVehicleView.of(vehicle, true);
    }

    @Transactional
    public RentalVehicleView update(UUID id, RentalVehicleInput input, UUID actor) {
        validateYear(input.year());
        RentalVehicle vehicle = load(id);
        vehicle.applyDetails(input, Money.parseAmount(input.dailyRateAmount(), "dailyRateAmount"),
                Money.parseAmount(input.depositAmount(), "depositAmount"));
        audit.record(actor, "RENTAL_VEHICLE_UPDATED", "RentalVehicle", id, null);
        vehicles.flush();
        return RentalVehicleView.of(vehicle, true);
    }

    @Transactional
    public RentalVehicleView setStatus(UUID id, RentalVehicleStatus status, UUID actor) {
        RentalVehicle vehicle = load(id);
        if (vehicle.getStatus() != status) {
            vehicle.setStatus(status);
            audit.record(actor, "RENTAL_VEHICLE_STATUS_CHANGED", "RentalVehicle", id, status.name());
        }
        vehicles.flush();
        return RentalVehicleView.of(vehicle, true);
    }

    @Transactional
    public RentalVehicleView setPublished(UUID id, boolean published, UUID actor) {
        RentalVehicle vehicle = load(id);
        if (published && vehicle.getStatus() == RentalVehicleStatus.UNAVAILABLE) {
            throw new BusinessRuleException("VEHICLE_UNAVAILABLE", "Unavailable vehicles cannot be published.");
        }
        if (vehicle.isPublished() != published) {
            vehicle.setPublished(published, clock.instant());
            audit.record(actor, published ? "RENTAL_VEHICLE_PUBLISHED" : "RENTAL_VEHICLE_UNPUBLISHED", "RentalVehicle", id, null);
        }
        vehicles.flush();
        return RentalVehicleView.of(vehicle, true);
    }

    @Transactional
    public RentalVehicleView addImage(UUID vehicleId, VehicleImageInput input, UUID actor) {
        RentalVehicle vehicle = load(vehicleId);
        String url = input.url().trim();
        if (!(url.startsWith("https://") || url.startsWith("/uploads/") || url.startsWith("/assets/"))) {
            throw new BusinessRuleException("INVALID_IMAGE_URL", "Image URL must use https or be a site-relative upload path.");
        }
        if (vehicle.getImages().size() >= MAX_IMAGES) {
            throw new BusinessRuleException("TOO_MANY_IMAGES", "A vehicle can have at most " + MAX_IMAGES + " images.");
        }
        int order = input.sortOrder() != null ? input.sortOrder() : vehicle.getImages().size();
        vehicle.getImages().add(new RentalVehicleImage(vehicle, url, input.altText().trim(), order));
        audit.record(actor, "RENTAL_VEHICLE_IMAGE_ADDED", "RentalVehicle", vehicleId, url);
        vehicles.flush();
        return RentalVehicleView.of(vehicle, true);
    }

    @Transactional
    public RentalVehicleView removeImage(UUID vehicleId, UUID imageId, UUID actor) {
        RentalVehicle vehicle = load(vehicleId);
        RentalVehicleImage image = vehicle.getImages().stream().filter(i -> i.getId().equals(imageId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Image not found."));
        vehicle.getImages().remove(image);
        storage.deletePublicAfterCommit(image.getUrl());
        audit.record(actor, "RENTAL_VEHICLE_IMAGE_REMOVED", "RentalVehicle", vehicleId, imageId.toString());
        vehicles.flush();
        return RentalVehicleView.of(vehicle, true);
    }

    @Transactional
    public RentalVehicleView reorderImages(UUID vehicleId, List<UUID> orderedIds, UUID actor) {
        RentalVehicle vehicle = load(vehicleId);
        List<UUID> current = vehicle.getImages().stream().map(RentalVehicleImage::getId).toList();
        if (orderedIds.size() != current.size() || !orderedIds.containsAll(current)) {
            throw new BusinessRuleException("INVALID_IMAGE_ORDER", "Provide every image of this vehicle exactly once.");
        }
        vehicle.getImages().forEach(i -> i.setSortOrder(orderedIds.indexOf(i.getId())));
        vehicle.getImages().sort(java.util.Comparator.comparingInt(RentalVehicleImage::getSortOrder));
        audit.record(actor, "RENTAL_VEHICLE_IMAGES_REORDERED", "RentalVehicle", vehicleId, null);
        vehicles.flush();
        return RentalVehicleView.of(vehicle, true);
    }

    // ------------------------------------------------------------------ helpers

    private RentalVehicle load(UUID id) {
        return vehicles.findById(id).orElseThrow(() -> new NotFoundException("Vehicle not found."));
    }

    private void validateDates(LocalDate start, LocalDate end) {
        if (start == null || end == null) {
            throw new BusinessRuleException("INVALID_DATES", "Choose both a start and an end date.");
        }
        LocalDate today = today();
        if (start.isBefore(today)) {
            throw new BusinessRuleException("INVALID_DATES", "The start date cannot be in the past.");
        }
        if (start.isAfter(today.plusDays(MAX_LEAD_DAYS))) {
            throw new BusinessRuleException("INVALID_DATES", "Reservations can be made at most " + MAX_LEAD_DAYS + " days ahead.");
        }
        if (!end.isAfter(start)) {
            throw new BusinessRuleException("INVALID_DATES", "The end date must be after the start date.");
        }
        if (days(start, end) > MAX_RENTAL_DAYS) {
            throw new BusinessRuleException("RENTAL_TOO_LONG", "Rentals are limited to " + MAX_RENTAL_DAYS + " days online.");
        }
    }

    private static int days(LocalDate start, LocalDate end) {
        return (int) (end.toEpochDay() - start.toEpochDay());
    }

    private void validateYear(int year) {
        int max = Year.now(ZoneId.of(properties.timezone())).getValue() + 1;
        if (year > max) {
            throw new BusinessRuleException("INVALID_YEAR", "Model year cannot be later than " + max + ".");
        }
    }

    private String uniqueSlug(RentalVehicleInput input) {
        String base = Identifiers.slugify(input.year() + " " + input.make() + " " + input.model()
                + (input.variant() == null ? "" : " " + input.variant()) + " rental");
        String slug = base;
        while (vehicles.existsBySlug(slug)) {
            slug = base + "-" + Identifiers.randomToken(5).toLowerCase(Locale.ROOT);
        }
        return slug;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String notificationBody(RentalReservation r, ReservationStatus status) {
        String vehicle = r.getVehicle().getMake() + " " + r.getVehicle().getModel();
        return switch (status) {
            case CONFIRMED -> "Your rental reservation for the " + vehicle + " (" + r.getStartDate() + " to "
                    + r.getEndDate() + ") is confirmed.";
            case ACTIVE -> "Your rental of the " + vehicle + " has started. Have a safe trip!";
            case COMPLETED -> "Thank you — your rental of the " + vehicle + " is complete.";
            case CANCELLED -> "Your reservation for the " + vehicle + " was cancelled. Contact us if this is unexpected.";
            case PENDING -> "Your reservation is pending.";
        };
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
