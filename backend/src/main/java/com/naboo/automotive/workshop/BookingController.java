package com.naboo.automotive.workshop;

import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;
import com.naboo.automotive.workshop.JobTypes.CreateJobInput;
import com.naboo.automotive.workshop.JobTypes.JobView;
import com.naboo.automotive.workshop.JobTypes.UpdateJobInput;
import com.naboo.automotive.workshop.ServiceBooking.BookingStatus;
import com.naboo.automotive.workshop.WorkshopJob.JobStatus;
import com.naboo.automotive.workshop.WorkshopTypes.BookingInput;
import com.naboo.automotive.workshop.WorkshopTypes.BookingView;
import com.naboo.automotive.workshop.WorkshopTypes.CapacityInput;
import com.naboo.automotive.workshop.WorkshopTypes.CapacityView;
import com.naboo.automotive.workshop.WorkshopTypes.UpdateBookingInput;

import jakarta.validation.Valid;

@Controller
@Validated
public class BookingController {

    private final WorkshopBookingService bookingService;
    private final WorkshopJobService jobService;

    public BookingController(WorkshopBookingService bookingService, WorkshopJobService jobService) {
        this.bookingService = bookingService;
        this.jobService = jobService;
    }

    // ------------------------------------------------------------------ public

    @MutationMapping
    public EnquiryReceipt bookService(@Argument @Valid BookingInput input, @AuthenticationPrincipal Jwt jwt) {
        return bookingService.book(input, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ customer

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public PageView<BookingView> myServiceBookings(@AuthenticationPrincipal Jwt jwt, @Argument Integer page,
            @Argument Integer size) {
        return bookingService.myBookings(CurrentUser.id(jwt), page, size);
    }

    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public BookingView cancelMyBooking(@Argument UUID id, @AuthenticationPrincipal Jwt jwt) {
        return bookingService.cancelMine(id, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ staff

    @QueryMapping
    @PreAuthorize(Permissions.BOOKING_MANAGE)
    public PageView<BookingView> serviceBookings(@Argument BookingStatus status, @Argument Integer page,
            @Argument Integer size) {
        return bookingService.list(status, page, size);
    }

    @QueryMapping
    @PreAuthorize(Permissions.BOOKING_MANAGE)
    public CapacityView workshopCapacity() {
        return bookingService.capacity();
    }

    @MutationMapping
    @PreAuthorize(Permissions.BOOKING_MANAGE)
    public BookingView updateServiceBooking(@Argument UUID id, @Argument @Valid UpdateBookingInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return bookingService.update(id, input.status(), CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.BOOKING_MANAGE)
    public CapacityView setWorkshopCapacity(@Argument @Valid CapacityInput input, @AuthenticationPrincipal Jwt jwt) {
        return bookingService.setCapacity(input.maxConcurrentJobs(), CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ workshop jobs

    @QueryMapping
    @PreAuthorize(Permissions.WORKSHOP_MANAGE)
    public PageView<JobView> workshopJobs(@Argument JobStatus status, @Argument UUID assignedToUserId,
            @Argument Integer page, @Argument Integer size) {
        return jobService.list(status, assignedToUserId, page, size);
    }

    @MutationMapping
    @PreAuthorize(Permissions.WORKSHOP_MANAGE)
    public JobView createWorkshopJob(@Argument @Valid CreateJobInput input, @AuthenticationPrincipal Jwt jwt) {
        return jobService.create(input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.WORKSHOP_MANAGE)
    public JobView updateWorkshopJob(@Argument UUID id, @Argument @Valid UpdateJobInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return jobService.update(id, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.WORKSHOP_MANAGE)
    public JobView setWorkshopJobStatus(@Argument UUID id, @Argument JobStatus status, @AuthenticationPrincipal Jwt jwt) {
        return jobService.setStatus(id, status, CurrentUser.id(jwt));
    }
}
