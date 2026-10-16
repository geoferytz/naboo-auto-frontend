package com.naboo.automotive.quotations;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
@Table(name = "quotations")
public class Quotation {

    public enum WorkType { PAINTING, COLOUR_CHANGE, DETAILING, RESTORATION, REPAIR, MAINTENANCE, ACCESSORIES, OTHER }

    public enum QuotationStatus {
        REQUESTED, QUOTED, ACCEPTED, DECLINED, EXPIRED, CANCELLED
    }

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(name = "request_token", unique = true)
    private UUID requestToken;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ServiceOffering service;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_type", nullable = false)
    private WorkType workType;

    @Column(name = "vehicle_description", nullable = false)
    private String vehicleDescription;

    @Column(nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuotationStatus status;

    @Column(name = "quoted_amount", precision = 14, scale = 2)
    private BigDecimal quotedAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "staff_notes")
    private String staffNotes;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected Quotation() {
    }

    /** A customer-submitted request (no amount yet). */
    public Quotation(String reference, UUID requestToken, ServiceOffering service, UUID customerId, UUID userId,
            String fullName, String email, String phone, WorkType workType, String vehicleDescription,
            String description, String currency) {
        this.reference = reference;
        this.requestToken = requestToken;
        this.service = service;
        this.customerId = customerId;
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.workType = workType;
        this.vehicleDescription = vehicleDescription;
        this.description = description;
        this.currency = currency;
        this.status = QuotationStatus.REQUESTED;
    }

    /** Staff attaches a price and validity window: REQUESTED -> QUOTED. */
    public void quote(BigDecimal amount, LocalDate validUntil, String staffNotes, UUID staffUser, LocalDate today) {
        if (status != QuotationStatus.REQUESTED && status != QuotationStatus.QUOTED) {
            throw new BusinessRuleException("INVALID_STATUS_CHANGE", "A " + status + " quotation can no longer be priced.");
        }
        if (validUntil == null || !validUntil.isAfter(today)) {
            throw new BusinessRuleException("INVALID_VALIDITY", "The quotation must be valid until a future date.");
        }
        this.quotedAmount = amount;
        this.validUntil = validUntil;
        this.staffNotes = staffNotes;
        this.createdByUserId = staffUser;
        this.status = QuotationStatus.QUOTED;
    }

    /** Customer decision on a live quote. */
    public void decide(boolean accept, Instant now, LocalDate today) {
        expireIfNeeded(today);
        if (status != QuotationStatus.QUOTED) {
            throw new BusinessRuleException("INVALID_STATUS_CHANGE", "This quotation is " + status.name().toLowerCase()
                    + " and can no longer be decided.");
        }
        this.status = accept ? QuotationStatus.ACCEPTED : QuotationStatus.DECLINED;
        this.decidedAt = now;
    }

    public void cancel() {
        if (status == QuotationStatus.ACCEPTED || status == QuotationStatus.EXPIRED || status == QuotationStatus.CANCELLED) {
            throw new BusinessRuleException("INVALID_STATUS_CHANGE", "A " + status + " quotation cannot be cancelled.");
        }
        this.status = QuotationStatus.CANCELLED;
    }

    /** Lazily expires a sent quotation once its validity date passes. */
    public void expireIfNeeded(LocalDate today) {
        if (status == QuotationStatus.QUOTED && validUntil != null && !validUntil.isAfter(today)) {
            this.status = QuotationStatus.EXPIRED;
        }
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

    public UUID getUserId() {
        return userId;
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

    public WorkType getWorkType() {
        return workType;
    }

    public String getVehicleDescription() {
        return vehicleDescription;
    }

    public String getDescription() {
        return description;
    }

    public QuotationStatus getStatus() {
        return status;
    }

    public BigDecimal getQuotedAmount() {
        return quotedAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public String getStaffNotes() {
        return staffNotes;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
