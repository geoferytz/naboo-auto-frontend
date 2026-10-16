package com.naboo.automotive.workshop;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.common.BusinessRuleException;

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

/** A workshop job card, optionally raised from a confirmed service booking. */
@Entity
@Table(name = "workshop_jobs")
public class WorkshopJob {

    public enum JobStatus {
        SCHEDULED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED;

        public boolean canTransitionTo(JobStatus next) {
            return switch (this) {
                case SCHEDULED -> next == IN_PROGRESS || next == CANCELLED;
                case IN_PROGRESS -> next == ON_HOLD || next == COMPLETED || next == CANCELLED;
                case ON_HOLD -> next == IN_PROGRESS || next == CANCELLED;
                case COMPLETED, CANCELLED -> false;
            };
        }
    }

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private ServiceBooking booking;

    @Column(name = "vehicle_description", nullable = false)
    private String vehicleDescription;

    @Column(nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    @Column(name = "assigned_to_user_id")
    private UUID assignedToUserId;

    @Column(name = "scheduled_for")
    private Instant scheduledFor;

    @Column(name = "labor_notes")
    private String laborNotes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected WorkshopJob() {
    }

    public WorkshopJob(String reference, ServiceBooking booking, String vehicleDescription, String description,
            Instant scheduledFor) {
        this.reference = reference;
        this.booking = booking;
        this.vehicleDescription = vehicleDescription;
        this.description = description;
        this.scheduledFor = scheduledFor;
        this.status = JobStatus.SCHEDULED;
    }

    public void transition(JobStatus next) {
        if (!status.canTransitionTo(next)) {
            throw new BusinessRuleException("INVALID_STATUS_CHANGE", "A " + status + " job cannot become " + next + ".");
        }
        this.status = next;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setAssignedToUserId(UUID assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public void setLaborNotes(String laborNotes) {
        this.laborNotes = laborNotes;
    }

    public void setScheduledFor(Instant scheduledFor) {
        this.scheduledFor = scheduledFor;
    }

    public UUID getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public ServiceBooking getBooking() {
        return booking;
    }

    public String getVehicleDescription() {
        return vehicleDescription;
    }

    public String getDescription() {
        return description;
    }

    public JobStatus getStatus() {
        return status;
    }

    public UUID getAssignedToUserId() {
        return assignedToUserId;
    }

    public Instant getScheduledFor() {
        return scheduledFor;
    }

    public String getLaborNotes() {
        return laborNotes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
