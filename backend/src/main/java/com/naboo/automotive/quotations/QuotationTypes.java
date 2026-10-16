package com.naboo.automotive.quotations;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.naboo.automotive.auth.AuthInputs;
import com.naboo.automotive.common.Money;
import com.naboo.automotive.quotations.Quotation.QuotationStatus;
import com.naboo.automotive.quotations.Quotation.WorkType;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class QuotationTypes {

    private QuotationTypes() {
    }

    public record QuotationRequestInput(
            UUID serviceId,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = AuthInputs.PHONE_PATTERN, message = "must be a valid phone number") String phone,
            @NotNull WorkType workType,
            @NotBlank @Size(max = 200) String vehicleDescription,
            @NotBlank @Size(max = 4000) String description,
            UUID requestToken) {
    }

    public record QuoteInput(
            @NotBlank @Size(max = 20) String quotedAmount,
            @NotNull LocalDate validUntil,
            @Size(max = 2000) String staffNotes) {
    }

    public record QuotationView(UUID id, String reference, String serviceName, String fullName, String email, String phone,
            WorkType workType, String vehicleDescription, String description, QuotationStatus status, Money quotedAmount,
            LocalDate validUntil, String staffNotes, Instant decidedAt, Instant createdAt) {

        public static QuotationView of(Quotation q) {
            return new QuotationView(q.getId(), q.getReference(),
                    q.getService() == null ? null : q.getService().getName(), q.getFullName(), q.getEmail(), q.getPhone(),
                    q.getWorkType(), q.getVehicleDescription(), q.getDescription(), q.getStatus(),
                    Money.of(q.getQuotedAmount(), q.getCurrency()), q.getValidUntil(), q.getStaffNotes(),
                    q.getDecidedAt(), q.getCreatedAt());
        }
    }
}
