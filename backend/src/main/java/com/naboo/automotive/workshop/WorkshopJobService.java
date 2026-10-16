package com.naboo.automotive.workshop;

import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.workshop.ServiceBooking.BookingStatus;
import com.naboo.automotive.workshop.WorkshopJob.JobStatus;
import com.naboo.automotive.workshop.JobTypes.CreateJobInput;
import com.naboo.automotive.workshop.JobTypes.JobView;
import com.naboo.automotive.workshop.JobTypes.UpdateJobInput;

@Service
public class WorkshopJobService {

    private final WorkshopJobRepository jobs;
    private final ServiceBookingRepository bookings;
    private final AuditService audit;

    public WorkshopJobService(WorkshopJobRepository jobs, ServiceBookingRepository bookings, AuditService audit) {
        this.jobs = jobs;
        this.bookings = bookings;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageView<JobView> list(JobStatus status, UUID assignedToUserId, Integer page, Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.asc("scheduledFor"), Sort.Order.desc("createdAt")));
        var result = status != null ? jobs.findByStatus(status, request)
                : assignedToUserId != null ? jobs.findByAssignedToUserId(assignedToUserId, request) : jobs.findAll(request);
        return PageView.of(result, JobView::of);
    }

    @Transactional
    public JobView create(CreateJobInput input, UUID actor) {
        ServiceBooking booking = input.bookingId() == null ? null
                : bookings.findById(input.bookingId()).orElseThrow(() -> new NotFoundException("Booking not found."));
        if (booking != null && (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.NO_SHOW)) {
            throw new BusinessRuleException("BOOKING_CLOSED", "A job cannot be raised for a " + booking.getStatus() + " booking.");
        }
        WorkshopJob job = new WorkshopJob(Identifiers.reference("JOB"), booking, input.vehicleDescription().trim(),
                input.description().trim(), input.scheduledFor());
        job.setAssignedToUserId(input.assignedToUserId());
        jobs.saveAndFlush(job);
        audit.record(actor, "WORKSHOP_JOB_CREATED", "WorkshopJob", job.getId(), job.getReference());
        return JobView.of(job);
    }

    @Transactional
    public JobView update(UUID id, UpdateJobInput input, UUID actor) {
        WorkshopJob job = load(id);
        if (job.getStatus() == JobStatus.COMPLETED || job.getStatus() == JobStatus.CANCELLED) {
            throw new BusinessRuleException("JOB_CLOSED", "A " + job.getStatus() + " job can no longer be edited.");
        }
        if (input.description() != null && !input.description().isBlank()) {
            job.setDescription(input.description().trim());
        }
        if (input.scheduledFor() != null) {
            job.setScheduledFor(input.scheduledFor());
        }
        if (input.assignedToUserId() != null) {
            job.setAssignedToUserId(input.assignedToUserId());
        }
        if (input.laborNotes() != null) {
            job.setLaborNotes(input.laborNotes().isBlank() ? null : input.laborNotes().trim());
        }
        audit.record(actor, "WORKSHOP_JOB_UPDATED", "WorkshopJob", id, job.getReference());
        jobs.flush();
        return JobView.of(job);
    }

    @Transactional
    public JobView setStatus(UUID id, JobStatus status, UUID actor) {
        WorkshopJob job = load(id);
        JobStatus previous = job.getStatus();
        job.transition(status);
        jobs.flush();
        if (previous != status) {
            audit.record(actor, "WORKSHOP_JOB_STATUS_CHANGED", "WorkshopJob", id, previous + " -> " + status);
        }
        return JobView.of(job);
    }

    private WorkshopJob load(UUID id) {
        return jobs.findById(id).orElseThrow(() -> new NotFoundException("Job not found."));
    }
}
