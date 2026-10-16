package com.naboo.automotive.billing;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.naboo.automotive.auth.AuthInputs;
import com.naboo.automotive.billing.Invoice.InvoiceStatus;
import com.naboo.automotive.billing.Payment.PaymentMethod;
import com.naboo.automotive.common.Money;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class BillingTypes {

    private BillingTypes() {
    }

    public record InvoiceItemInput(
            @NotBlank @Size(max = 300) String description,
            @NotNull @Positive @Max(10000) Integer quantity,
            @NotBlank @Size(max = 20) String unitPrice) {
    }

    public record InvoiceInput(
            UUID customerUserId,
            @NotBlank @Size(max = 120) String recipientName,
            @NotBlank @Email @Size(max = 254) String recipientEmail,
            @NotNull @Size(min = 1, max = 50) List<@Valid InvoiceItemInput> items,
            UUID bookingId,
            UUID orderId,
            UUID quotationId,
            LocalDate dueDate,
            @Size(max = 2000) String notes) {
    }

    public record PaymentInput(
            @NotBlank @Size(max = 20) String amount,
            @NotNull PaymentMethod method,
            @Size(max = 60) @Pattern(regexp = "^[A-Za-z0-9\\-_ ]*$", message = "letters, digits, dashes only") String reference,
            Instant paidAt,
            @Size(max = 500) String note) {
    }

    public record InvoiceItemView(UUID id, String description, int quantity, Money unitPrice, Money lineTotal) {
    }

    public record PaymentView(UUID id, Money amount, PaymentMethod method, String reference, Instant paidAt,
            String note) {

        static PaymentView of(Payment p) {
            return new PaymentView(p.getId(), Money.of(p.getAmount(), p.getCurrency()), p.getMethod(), p.getReference(),
                    p.getPaidAt(), p.getNote());
        }
    }

    public record InvoiceView(UUID id, String reference, String recipientName, String recipientEmail,
            InvoiceStatus status, Money total, Money paid, Money balance, LocalDate dueDate, Instant issuedAt,
            Instant paidAt, String notes, UUID bookingId, UUID orderId, UUID quotationId,
            List<InvoiceItemView> items, List<PaymentView> payments, Instant createdAt) {

        static InvoiceView of(Invoice i, java.math.BigDecimal paid, List<PaymentView> payments) {
            return new InvoiceView(i.getId(), i.getReference(), i.getRecipientName(), i.getRecipientEmail(),
                    i.getStatus(), Money.of(i.getTotalAmount(), i.getCurrency()), Money.of(paid, i.getCurrency()),
                    Money.of(i.getTotalAmount().subtract(paid).max(java.math.BigDecimal.ZERO), i.getCurrency()),
                    i.getDueDate(), i.getIssuedAt(), i.getPaidAt(), i.getNotes(), i.getBookingId(), i.getOrderId(),
                    i.getQuotationId(),
                    i.getItems().stream().map(it -> new InvoiceItemView(it.getId(), it.getDescription(), it.getQuantity(),
                            Money.of(it.getUnitPrice(), i.getCurrency()), Money.of(it.getLineTotal(), i.getCurrency())))
                            .toList(),
                    payments, i.getCreatedAt());
        }
    }
}
