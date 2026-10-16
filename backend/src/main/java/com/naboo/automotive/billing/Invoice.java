package com.naboo.automotive.billing;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.common.BusinessRuleException;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "invoices")
public class Invoice {

    public enum InvoiceStatus { DRAFT, ISSUED, PAID, VOID }

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "quotation_id")
    private UUID quotationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    private String notes;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected Invoice() {
    }

    public Invoice(String reference, UUID customerId, String recipientName, String recipientEmail, UUID bookingId,
            UUID orderId, UUID quotationId, String currency, LocalDate dueDate, String notes) {
        this.reference = reference;
        this.customerId = customerId;
        this.recipientName = recipientName;
        this.recipientEmail = recipientEmail;
        this.bookingId = bookingId;
        this.orderId = orderId;
        this.quotationId = quotationId;
        this.currency = currency;
        this.dueDate = dueDate;
        this.notes = notes;
        this.totalAmount = BigDecimal.ZERO;
        this.status = InvoiceStatus.DRAFT;
    }

    public void addItem(InvoiceItem item) {
        requireDraft();
        items.add(item);
        recomputeTotal();
    }

    public void removeItem(UUID itemId) {
        requireDraft();
        if (!items.removeIf(i -> i.getId().equals(itemId))) {
            throw new BusinessRuleException("ITEM_NOT_FOUND", "That line item is not on this invoice.");
        }
        recomputeTotal();
    }

    public void issue(Instant now) {
        requireDraft();
        if (items.isEmpty() || totalAmount.signum() <= 0) {
            throw new BusinessRuleException("EMPTY_INVOICE", "Add at least one priced line item before issuing.");
        }
        this.status = InvoiceStatus.ISSUED;
        this.issuedAt = now;
    }

    public void voidInvoice() {
        if (status == InvoiceStatus.PAID) {
            throw new BusinessRuleException("ALREADY_PAID", "A paid invoice cannot be voided.");
        }
        if (status == InvoiceStatus.VOID) {
            return;
        }
        this.status = InvoiceStatus.VOID;
    }

    public void markPaid(Instant now) {
        this.status = InvoiceStatus.PAID;
        this.paidAt = now;
    }

    public void requireIssuable() {
        if (status != InvoiceStatus.ISSUED) {
            throw new BusinessRuleException("NOT_PAYABLE", "Payments can only be recorded on an issued invoice.");
        }
    }

    private void requireDraft() {
        if (status != InvoiceStatus.DRAFT) {
            throw new BusinessRuleException("INVOICE_CLOSED", "A " + status + " invoice can no longer be edited.");
        }
    }

    private void recomputeTotal() {
        this.totalAmount = items.stream().map(InvoiceItem::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public UUID getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public UUID getQuotationId() {
        return quotationId;
    }

    public InvoiceStatus getStatus() {
        return status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public String getNotes() {
        return notes;
    }

    public List<InvoiceItem> getItems() {
        return items;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
