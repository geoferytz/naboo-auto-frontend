package com.naboo.automotive.workshop;

import java.time.Instant;
import java.util.UUID;

import com.naboo.automotive.workshop.WorkshopJob.JobStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class JobTypes {

    private JobTypes() {
    }

    public record CreateJobInput(
            UUID bookingId,
            @NotBlank @Size(max = 200) String vehicleDescription,
            @NotBlank @Size(max = 4000) String description,
            Instant scheduledFor,
            UUID assignedToUserId) {
    }

    public record UpdateJobInput(
            @Size(max = 4000) String description,
            Instant scheduledFor,
            UUID assignedToUserId,
            @Size(max = 4000) String laborNotes) {
    }

    public record JobView(UUID id, String reference, BookingSummary booking, String vehicleDescription,
            String description, JobStatus status, UUID assignedToUserId, Instant scheduledFor, String laborNotes,
            Instant createdAt) {

        public static JobView of(WorkshopJob j) {
            return new JobView(j.getId(), j.getReference(), j.getBooking() == null ? null : BookingSummary.of(j.getBooking()),
                    j.getVehicleDescription(), j.getDescription(), j.getStatus(), j.getAssignedToUserId(),
                    j.getScheduledFor(), j.getLaborNotes(), j.getCreatedAt());
        }
    }

    public record BookingSummary(UUID id, String reference, String serviceName) {
        static BookingSummary of(ServiceBooking b) {
            return new BookingSummary(b.getId(), b.getReference(), b.getService().getName());
        }
    }
}
