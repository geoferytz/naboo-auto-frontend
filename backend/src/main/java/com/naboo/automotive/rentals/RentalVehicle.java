package com.naboo.automotive.rentals;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.rentals.RentalInputs.RentalVehicleInput;
import com.naboo.automotive.rentals.RentalTypes.RentalVehicleStatus;
import com.naboo.automotive.vehicles.VehicleTypes.BodyType;
import com.naboo.automotive.vehicles.VehicleTypes.FuelType;
import com.naboo.automotive.vehicles.VehicleTypes.Transmission;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "rental_vehicles")
public class RentalVehicle {

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

    private Integer seats;

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

    @Column(length = 80)
    private String location;

    private String description;

    @Column(name = "registration_number")
    private String registrationNumber;

    @Column(name = "daily_rate_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal dailyRateAmount;

    @Column(name = "deposit_amount", precision = 14, scale = 2)
    private BigDecimal depositAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RentalVehicleStatus status;

    private boolean published;

    @Column(name = "published_at")
    private Instant publishedAt;

    @OneToMany(mappedBy = "vehicle", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, createdAt ASC")
    private List<RentalVehicleImage> images = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected RentalVehicle() {
    }

    public RentalVehicle(String slug, String currency) {
        this.slug = slug;
        this.currency = currency;
        this.status = RentalVehicleStatus.AVAILABLE;
    }

    public void applyDetails(RentalVehicleInput in, BigDecimal dailyRate, BigDecimal deposit) {
        this.make = in.make().trim();
        this.model = in.model().trim();
        this.variant = trimToNull(in.variant());
        this.modelYear = in.year();
        this.seats = in.seats();
        this.fuelType = in.fuelType();
        this.transmission = in.transmission();
        this.bodyType = in.bodyType();
        this.color = trimToNull(in.color());
        this.location = trimToNull(in.location());
        this.description = trimToNull(in.description());
        this.registrationNumber = trimToNull(in.registrationNumber());
        this.dailyRateAmount = dailyRate;
        this.depositAmount = deposit;
    }

    public void setStatus(RentalVehicleStatus status) {
        this.status = status;
    }

    public void setPublished(boolean published, Instant now) {
        if (published && !this.published) {
            this.publishedAt = now;
        }
        this.published = published;
    }

    public boolean isPubliclyVisible() {
        return published && status == RentalVehicleStatus.AVAILABLE;
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

    public Integer getSeats() {
        return seats;
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

    public String getLocation() {
        return location;
    }

    public String getDescription() {
        return description;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public BigDecimal getDailyRateAmount() {
        return dailyRateAmount;
    }

    public BigDecimal getDepositAmount() {
        return depositAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public RentalVehicleStatus getStatus() {
        return status;
    }

    public boolean isPublished() {
        return published;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public List<RentalVehicleImage> getImages() {
        return images;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
