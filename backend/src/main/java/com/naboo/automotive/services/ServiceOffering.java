package com.naboo.automotive.services;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** A workshop service offered to customers (table {@code services}). */
@Entity
@Table(name = "services")
public class ServiceOffering {

    public enum PriceType {
        FIXED, STARTING_FROM, HOURLY, INSPECTION_REQUIRED, QUOTE_REQUIRED;

        public boolean requiresAmount() {
            return this == FIXED || this == STARTING_FROM || this == HOURLY;
        }
    }

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private ServiceCategory category;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String summary;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_type", nullable = false)
    private PriceType priceType;

    @Column(name = "price_amount", precision = 14, scale = 2)
    private BigDecimal priceAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected ServiceOffering() {
    }

    public ServiceOffering(String slug, String currency) {
        this.slug = slug;
        this.currency = currency;
    }

    public void apply(ServiceCategory category, String name, String summary, String description, PriceType priceType,
            BigDecimal priceAmount, Integer durationMinutes, boolean active, int sortOrder) {
        this.category = category;
        this.name = name;
        this.summary = summary;
        this.description = description;
        this.priceType = priceType;
        this.priceAmount = priceType.requiresAmount() ? priceAmount : null;
        this.durationMinutes = durationMinutes;
        this.active = active;
        this.sortOrder = sortOrder;
    }

    public UUID getId() {
        return id;
    }

    public ServiceCategory getCategory() {
        return category;
    }

    public String getSlug() {
        return slug;
    }

    public String getName() {
        return name;
    }

    public String getSummary() {
        return summary;
    }

    public String getDescription() {
        return description;
    }

    public PriceType getPriceType() {
        return priceType;
    }

    public BigDecimal getPriceAmount() {
        return priceAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public boolean isActive() {
        return active;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
