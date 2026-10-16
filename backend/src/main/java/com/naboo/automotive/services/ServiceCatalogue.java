package com.naboo.automotive.services;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.Money;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.services.ServiceOffering.PriceType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

@Service
public class ServiceCatalogue {

    public record CategoryView(UUID id, String slug, String name, String description, int sortOrder) {
        static CategoryView of(ServiceCategory c) {
            return new CategoryView(c.getId(), c.getSlug(), c.getName(), c.getDescription(), c.getSortOrder());
        }
    }

    public record ServiceView(UUID id, String slug, String name, String summary, String description, CategoryView category,
            PriceType priceType, Money price, Integer durationMinutes, boolean active, int sortOrder) {
        static ServiceView of(ServiceOffering s) {
            return new ServiceView(s.getId(), s.getSlug(), s.getName(), s.getSummary(), s.getDescription(),
                    CategoryView.of(s.getCategory()), s.getPriceType(), Money.of(s.getPriceAmount(), s.getCurrency()),
                    s.getDurationMinutes(), s.isActive(), s.getSortOrder());
        }
    }

    public record CategoryInput(@NotBlank @Size(max = 80) String name, @Size(max = 500) String description,
            @PositiveOrZero Integer sortOrder) {
    }

    public record ServiceInput(
            @NotNull UUID categoryId,
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 300) String summary,
            @Size(max = 10000) String description,
            @NotNull PriceType priceType,
            @Size(max = 20) String priceAmount,
            @Positive @Max(10080) Integer durationMinutes,
            Boolean active,
            @PositiveOrZero Integer sortOrder) {
    }

    private final ServiceCategoryRepository categories;
    private final ServiceOfferingRepository services;
    private final AuditService audit;
    private final AppProperties properties;

    public ServiceCatalogue(ServiceCategoryRepository categories, ServiceOfferingRepository services, AuditService audit,
            AppProperties properties) {
        this.categories = categories;
        this.services = services;
        this.audit = audit;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public List<CategoryView> categories() {
        return categories.findAllByOrderBySortOrderAscNameAsc().stream().map(CategoryView::of).toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceView> activeServices(String categorySlug) {
        return services.findActive(categorySlug).stream().map(ServiceView::of).toList();
    }

    @Transactional(readOnly = true)
    public ServiceView activeBySlug(String slug) {
        return services.findBySlug(slug).filter(ServiceOffering::isActive).map(ServiceView::of).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ServiceView> allServices() {
        return services.findAllOrdered().stream().map(ServiceView::of).toList();
    }

    @Transactional
    public CategoryView createCategory(CategoryInput input, UUID actor) {
        String base = Identifiers.slugify(input.name());
        String slug = base;
        while (categories.existsBySlug(slug)) {
            slug = base + "-" + Identifiers.randomToken(4).toLowerCase(Locale.ROOT);
        }
        ServiceCategory category = new ServiceCategory(slug);
        category.apply(input.name().trim(), input.description(), input.sortOrder() == null ? 0 : input.sortOrder());
        categories.saveAndFlush(category);
        audit.record(actor, "SERVICE_CATEGORY_CREATED", "ServiceCategory", category.getId(), null);
        return CategoryView.of(category);
    }

    @Transactional
    public CategoryView updateCategory(UUID id, CategoryInput input, UUID actor) {
        ServiceCategory category = categories.findById(id).orElseThrow(() -> new NotFoundException("Category not found."));
        category.apply(input.name().trim(), input.description(), input.sortOrder() == null ? 0 : input.sortOrder());
        audit.record(actor, "SERVICE_CATEGORY_UPDATED", "ServiceCategory", id, null);
        categories.flush();
        return CategoryView.of(category);
    }

    @Transactional
    public ServiceView createService(ServiceInput input, UUID actor) {
        String base = Identifiers.slugify(input.name());
        String slug = base;
        while (services.existsBySlug(slug)) {
            slug = base + "-" + Identifiers.randomToken(4).toLowerCase(Locale.ROOT);
        }
        ServiceOffering service = new ServiceOffering(slug, properties.currency());
        apply(service, input);
        services.saveAndFlush(service);
        audit.record(actor, "SERVICE_CREATED", "Service", service.getId(), priceDetails(service));
        return ServiceView.of(service);
    }

    @Transactional
    public ServiceView updateService(UUID id, ServiceInput input, UUID actor) {
        ServiceOffering service = services.findById(id).orElseThrow(() -> new NotFoundException("Service not found."));
        String before = priceDetails(service);
        apply(service, input);
        String after = priceDetails(service);
        audit.record(actor, "SERVICE_UPDATED", "Service", id, before.equals(after) ? null : before + " -> " + after);
        services.flush();
        return ServiceView.of(service);
    }

    private void apply(ServiceOffering service, ServiceInput input) {
        ServiceCategory category = categories.findById(input.categoryId())
                .orElseThrow(() -> new NotFoundException("Category not found."));
        BigDecimal amount = Money.parseAmount(input.priceAmount(), "priceAmount");
        if (input.priceType().requiresAmount() && amount == null) {
            throw new BusinessRuleException("PRICE_REQUIRED", "A price is required for " + input.priceType() + " services.");
        }
        service.apply(category, input.name().trim(), input.summary().trim(), input.description(), input.priceType(), amount,
                input.durationMinutes(), input.active() == null || input.active(),
                input.sortOrder() == null ? 0 : input.sortOrder());
    }

    private static String priceDetails(ServiceOffering s) {
        return s.getPriceType() + " " + (s.getPriceAmount() == null ? "-" : s.getPriceAmount().toPlainString());
    }
}
