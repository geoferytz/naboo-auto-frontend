package com.naboo.automotive.rentals;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.rentals.RentalTypes.ReservationStatus;

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
@Table(name = "rental_reservations")
public class RentalReservation {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    /** Client-generated idempotency key; a repeated submission returns the original reservation. */
    @Column(name = "request_token", unique = true)
    private UUID requestToken;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rental_vehicle_id")
    private RentalVehicle vehicle;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status;

    /** Daily rate snapshot taken at booking time; later price changes do not alter reservations. */
    @Column(name = "daily_rate_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal dailyRateAmount;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected RentalReservation() {
    }

    public RentalReservation(String reference, UUID requestToken, RentalVehicle vehicle, UUID customerId, String fullName,
            String email, String phone, LocalDate startDate, LocalDate endDate, BigDecimal dailyRate,
            BigDecimal total, String currency, String notes) {
        this.reference = reference;
        this.requestToken = requestToken;
        this.vehicle = vehicle;
        this.customerId = customerId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.startDate = startDate;
        this.endDate = endDate;
        this.dailyRateAmount = dailyRate;
        this.totalAmount = total;
        this.currency = currency;
        this.notes = notes;
        this.status = ReservationStatus.PENDING;
    }

    public void transition(ReservationStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new BusinessRuleException("INVALID_STATUS_CHANGE", "A " + status + " reservation cannot become " + next + ".");
        }
        this.status = next;
    }

    public int days() {
        return (int) (endDate.toEpochDay() - startDate.toEpochDay());
    }

    public UUID getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public RentalVehicle getVehicle() {
        return vehicle;
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

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public ReservationStatus getStatus() {
        return status;
    }

    public BigDecimal getDailyRateAmount() {
        return dailyRateAmount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
