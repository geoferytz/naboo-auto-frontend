package com.naboo.automotive.vehicles;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.vehicles.VehicleTypes.EnquiryStatus;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryType;

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

@Entity
@Table(name = "vehicle_enquiries")
public class VehicleEnquiry {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Column(name = "customer_id")
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "enquiry_type", nullable = false)
    private EnquiryType type;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    private String message;

    @Column(name = "preferred_viewing_at")
    private Instant preferredViewingAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnquiryStatus status = EnquiryStatus.NEW;

    @Column(name = "assigned_to_user_id")
    private UUID assignedToUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected VehicleEnquiry() {
    }

    public VehicleEnquiry(String reference, Vehicle vehicle, UUID customerId, EnquiryType type, String fullName,
            String email, String phone, String message, Instant preferredViewingAt) {
        this.reference = reference;
        this.vehicle = vehicle;
        this.customerId = customerId;
        this.type = type;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.message = message;
        this.preferredViewingAt = preferredViewingAt;
    }

    public void update(EnquiryStatus status, UUID assignedToUserId) {
        this.status = status;
        this.assignedToUserId = assignedToUserId;
    }

    public UUID getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public Vehicle getVehicle() {
        return vehicle;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public EnquiryType getType() {
        return type;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getMessage() {
        return message;
    }

    public Instant getPreferredViewingAt() {
        return preferredViewingAt;
    }

    public EnquiryStatus getStatus() {
        return status;
    }

    public UUID getAssignedToUserId() {
        return assignedToUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
