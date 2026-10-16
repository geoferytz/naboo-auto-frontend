package com.naboo.automotive.rentals;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "rental_vehicle_images")
public class RentalVehicleImage {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rental_vehicle_id")
    private RentalVehicle vehicle;

    @Column(nullable = false)
    private String url;

    @Column(name = "alt_text", nullable = false)
    private String altText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected RentalVehicleImage() {
    }

    public RentalVehicleImage(RentalVehicle vehicle, String url, String altText, int sortOrder) {
        this.vehicle = vehicle;
        this.url = url;
        this.altText = altText;
        this.sortOrder = sortOrder;
    }

    public UUID getId() {
        return id;
    }

    public String getUrl() {
        return url;
    }

    public String getAltText() {
        return altText;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
