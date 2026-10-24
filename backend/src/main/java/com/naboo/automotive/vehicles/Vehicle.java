package com.naboo.automotive.vehicles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.vehicles.VehicleTypes.BodyType;
import com.naboo.automotive.vehicles.VehicleTypes.FuelType;
import com.naboo.automotive.vehicles.VehicleTypes.Transmission;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleCondition;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String make;

    @Column(nullable = false)
    private String model;

    private String variant;

    @Column(name = "model_year", nullable = false)
    private int modelYear;

    @Column(name = "mileage_km")
    private Integer mileageKm;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", nullable = false)
    private FuelType fuelType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Transmission transmission;

    @Enumerated(EnumType.STRING)
    @Column(name = "body_type", nullable = false)
    private BodyType bodyType;

    private String color;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_condition", nullable = false)
    private VehicleCondition condition;

    @Column(name = "engine_capacity_cc")
    private Integer engineCapacityCc;

    @Column(name = "engine_code", length = 30)
    private String engineCode;

    @Column(length = 80)
    private String location;

    private String description;

    @Column(name = "registration_number")
    private String registrationNumber;

    @Column(name = "price_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal priceAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleStatus status;

    private boolean published;

    @Column(name = "published_at")
    private Instant publishedAt;

    @ElementCollection
    @CollectionTable(name = "vehicle_features", joinColumns = @JoinColumn(name = "vehicle_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "feature")
    private List<String> features = new ArrayList<>();

    @OneToMany(mappedBy = "vehicle", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, createdAt ASC")
    private List<VehicleImage> images = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected Vehicle() {
    }

    public Vehicle(String slug, String currency) {
        this.slug = slug;
        this.currency = currency;
        this.status = VehicleStatus.AVAILABLE;
    }

    public void applyDetails(VehicleInputs.VehicleInput in, BigDecimal price) {
        this.make = in.make().trim();
        this.model = in.model().trim();
        this.variant = trimToNull(in.variant());
        this.modelYear = in.year();
        this.mileageKm = in.mileageKm();
        this.fuelType = in.fuelType();
        this.transmission = in.transmission();
        this.bodyType = in.bodyType();
        this.color = trimToNull(in.color());
        this.condition = in.condition();
        this.engineCapacityCc = in.engineCapacityCc();
        this.engineCode = trimToNull(in.engineCode());
        this.location = trimToNull(in.location());
        this.description = trimToNull(in.description());
        this.registrationNumber = trimToNull(in.registrationNumber());
        this.priceAmount = price;
        this.features.clear();
        if (in.features() != null) {
            in.features().stream().map(String::trim).filter(f -> !f.isEmpty()).distinct().forEach(this.features::add);
        }
    }

    /** @return the previous status */
    public VehicleStatus changeStatus(VehicleStatus newStatus) {
        VehicleStatus previous = this.status;
        this.status = newStatus;
        return previous;
    }

    public void setPublished(boolean published, Instant now) {
        if (published && !this.published) {
            this.publishedAt = now;
        }
        this.published = published;
    }

    public boolean isPubliclyVisible() {
        return published && status.isPubliclyListable();
    }

    public String title() {
        return modelYear + " " + make + " " + model + (variant == null ? "" : " " + variant);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }

    public String getMake() {
        return make;
    }

    public String getModel() {
        return model;
    }

    public String getVariant() {
        return variant;
    }

    public int getModelYear() {
        return modelYear;
    }

    public Integer getMileageKm() {
        return mileageKm;
    }

    public FuelType getFuelType() {
        return fuelType;
    }

    public Transmission getTransmission() {
        return transmission;
    }

    public BodyType getBodyType() {
        return bodyType;
    }

    public String getColor() {
        return color;
    }

    public VehicleCondition getCondition() {
        return condition;
    }

    public Integer getEngineCapacityCc() {
        return engineCapacityCc;
    }

    public String getEngineCode() {
        return engineCode;
    }

    public String getLocation() {
        return location;
    }

    public String getDescription() {
        return description;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public BigDecimal getPriceAmount() {
        return priceAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public VehicleStatus getStatus() {
        return status;
    }

    public boolean isPublished() {
        return published;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public List<String> getFeatures() {
        return features;
    }

    public List<VehicleImage> getImages() {
        return images;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
