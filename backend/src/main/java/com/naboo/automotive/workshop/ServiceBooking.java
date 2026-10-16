package com.naboo.automotive.workshop;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.services.ServiceOffering;

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
@Table(name = "service_bookings")
public class ServiceBooking {

    public enum BookingStatus {
        PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW;

        public boolean blocksCapacity() {
            return this == PENDING || this == CONFIRMED || this == IN_PROGRESS;
        }

        public boolean canTransitionTo(BookingStatus next) {
            return switch (this) {
                case PENDING -> next == CONFIRMED || next == CANCELLED;
                case CONFIRMED -> next == IN_PROGRESS || next == CANCELLED || next == NO_SHOW;
                case IN_PROGRESS -> next == COMPLETED;
                case COMPLETED, CANCELLED, NO_SHOW -> false;
            };
        }

        public boolean isCustomerCancellable() {
            return this == PENDING || this == CONFIRMED;
        }
    }

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(name = "request_token", unique = true)
    private UUID requestToken;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id")
    private ServiceOffering service;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(name = "vehicle_description", nullable = false)
    private String vehicleDescription;

    @Column(name = "scheduled_start", nullable = false)
    private Instant scheduledStart;

    @Column(name = "scheduled_end", nullable = false)
    private Instant scheduledEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected ServiceBooking() {
    }

    public ServiceBooking(String reference, UUID requestToken, ServiceOffering service, UUID customerId, String fullName,
            String email, String phone, String vehicleDescription, Instant scheduledStart, Instant scheduledEnd,
            String notes) {
        this.reference = reference;
        this.requestToken = requestToken;
        this.service = service;
        this.customerId = customerId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.vehicleDescription = vehicleDescription;
        this.scheduledStart = scheduledStart;
        this.scheduledEnd = scheduledEnd;
        this.notes = notes;
        this.status = BookingStatus.PENDING;
    }

    public void transition(BookingStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new BusinessRuleException("INVALID_STATUS_CHANGE", "A " + status + " booking cannot become " + next + ".");
        }
        this.status = next;
    }

    public UUID getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public ServiceOffering getService() {
        return service;
    }

    public UUID getCustomerId() {
        return customerId;
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

    public String getVehicleDescription() {
        return vehicleDescription;
    }

    public Instant getScheduledStart() {
        return scheduledStart;
    }

    public Instant getScheduledEnd() {
        return scheduledEnd;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
