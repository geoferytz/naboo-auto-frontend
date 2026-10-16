package com.naboo.automotive.billing;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
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

@Entity
@Table(name = "payments")
public class Payment {

    public enum PaymentMethod { CASH, CARD, BANK_TRANSFER, MPESA, TIGOPESA, AIRTEL_MONEY }

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    /** Optional external reference, e.g. a mobile-money transaction code. */
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt;

    @Column(name = "received_by_user_id")
    private UUID receivedByUserId;

    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected Payment() {
    }

    public Payment(Invoice invoice, BigDecimal amount, PaymentMethod method, Instant paidAt, UUID receivedByUserId,
            String reference, String note) {
        this.invoice = invoice;
        this.amount = amount;
        this.currency = invoice.getCurrency();
        this.method = method;
        this.paidAt = paidAt;
        this.receivedByUserId = receivedByUserId;
        this.reference = reference;
        this.note = note;
    }

    public UUID getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public PaymentMethod getMethod() {
        return method;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public UUID getReceivedByUserId() {
        return receivedByUserId;
    }

    public String getNote() {
        return note;
    }
}
