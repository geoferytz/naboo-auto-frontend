package com.naboo.automotive.workshop;

import java.time.Instant;
import java.util.UUID;

import com.naboo.automotive.auth.AuthInputs;
import com.naboo.automotive.services.ServiceOffering;
import com.naboo.automotive.workshop.ServiceBooking.BookingStatus;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class WorkshopTypes {

    private WorkshopTypes() {
    }

    public record BookingInput(
            @NotNull UUID serviceId,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = AuthInputs.PHONE_PATTERN, message = "must be a valid phone number") String phone,
            @NotBlank @Size(max = 200) String vehicleDescription,
            @NotNull Instant scheduledStart,
            @Size(max = 2000) String notes,
            UUID requestToken) {
    }

    public record BookingView(UUID id, String reference, ServiceSummary service, String fullName, String email, String phone,
            String vehicleDescription, Instant scheduledStart, Instant scheduledEnd, BookingStatus status, String notes,
            Instant createdAt) {

        public static BookingView of(ServiceBooking b) {
            return new BookingView(b.getId(), b.getReference(), ServiceSummary.of(b.getService()), b.getFullName(),
                    b.getEmail(), b.getPhone(), b.getVehicleDescription(), b.getScheduledStart(), b.getScheduledEnd(),
                    b.getStatus(), b.getNotes(), b.getCreatedAt());
        }
    }

    public record ServiceSummary(UUID id, String slug, String name, String category) {
        static ServiceSummary of(ServiceOffering s) {
            return new ServiceSummary(s.getId(), s.getSlug(), s.getName(), s.getCategory().getName());
        }
    }

    public record UpdateBookingInput(@NotNull BookingStatus status) {
    }

    public record CapacityInput(@NotNull @Positive Integer maxConcurrentJobs) {
    }

    public record CapacityView(int maxConcurrentJobs) {
    }
}
