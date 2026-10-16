package com.naboo.automotive.workshop;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthService;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.services.ServiceOffering;
import com.naboo.automotive.services.ServiceOfferingRepository;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;
import com.naboo.automotive.workshop.ServiceBooking.BookingStatus;
import com.naboo.automotive.workshop.WorkshopTypes.BookingInput;
import com.naboo.automotive.workshop.WorkshopTypes.BookingView;
import com.naboo.automotive.workshop.WorkshopTypes.CapacityView;

@Service
public class WorkshopBookingService {

    static final Duration MIN_NOTICE = Duration.ofHours(2);
    static final Duration MAX_AHEAD = Duration.ofDays(90);
    static final Duration DEFAULT_DURATION = Duration.ofMinutes(60);
    private static final LocalTime OPENS = LocalTime.of(8, 0);
    private static final LocalTime CLOSES = LocalTime.of(17, 0);

    private final ServiceBookingRepository bookings;
    private final ServiceOfferingRepository services;
    private final WorkshopCapacityRepository capacity;
    private final CustomerRepository customers;
    private final AuditService audit;
    private final AppProperties properties;
    private final Clock clock = Clock.systemUTC();

    public WorkshopBookingService(ServiceBookingRepository bookings, ServiceOfferingRepository services,
            WorkshopCapacityRepository capacity, CustomerRepository customers, AuditService audit,
            AppProperties properties) {
        this.bookings = bookings;
        this.services = services;
        this.capacity = capacity;
        this.customers = customers;
        this.audit = audit;
        this.properties = properties;
    }

    private ZoneId tz() {
        return ZoneId.of(properties.timezone());
    }

    @Transactional
    public EnquiryReceipt book(BookingInput input, UUID userId) {
        ServiceOffering service = services.findById(input.serviceId()).filter(ServiceOffering::isActive)
                .orElseThrow(() -> new NotFoundException("Service not found."));
        Instant start = input.scheduledStart();
        Duration duration = service.getDurationMinutes() == null ? DEFAULT_DURATION
                : Duration.ofMinutes(service.getDurationMinutes());
        Instant end = start.plus(duration);
        validateWindow(start, end);

        if (input.requestToken() != null) {
            var existing = bookings.findByRequestToken(input.requestToken());
            if (existing.isPresent()) {
                return receipt(existing.get(), true);
            }
        }

        // Serialise the capacity check: concurrent bookings lock the same row before counting.
        WorkshopCapacity cap = capacity.findForUpdate()
                .orElseThrow(() -> new IllegalStateException("Workshop capacity is not configured."));
        if (bookings.countBlockingOverlap(start, end) >= cap.getMaxConcurrentJobs()) {
            throw new BusinessRuleException("WORKSHOP_FULL",
                    "The workshop is fully booked at that time. Please choose a different time.");
        }

        UUID customerId = userId == null ? null : customers.findByUserId(userId).map(Customer::getId).orElse(null);
        ServiceBooking booking = new ServiceBooking(Identifiers.reference("BKG"), input.requestToken(), service,
                customerId, input.fullName().trim(), AuthService.normaliseEmail(input.email()), input.phone().trim(),
                input.vehicleDescription().trim(), start, end, blankToNull(input.notes()));
        try {
            bookings.saveAndFlush(booking);
        } catch (DataIntegrityViolationException e) {
            if (input.requestToken() != null) {
                var existing = bookings.findByRequestToken(input.requestToken());
                if (existing.isPresent()) {
                    return receipt(existing.get(), true);
                }
            }
            throw e;
        }
        audit.record(userId, "SERVICE_BOOKING_CREATED", "ServiceBooking", booking.getId(),
                booking.getReference() + " at " + start);
        return receipt(booking, false);
    }

    private static EnquiryReceipt receipt(ServiceBooking b, boolean duplicate) {
        return new EnquiryReceipt(b.getReference(), duplicate
                ? "This booking was already submitted. Your booking reference is unchanged."
                : "Booking request received. We will confirm your appointment shortly.");
    }

    private void validateWindow(Instant start, Instant end) {
        Instant now = clock.instant();
        if (start.isBefore(now.plus(MIN_NOTICE))) {
            throw new BusinessRuleException("INVALID_TIME", "Book at least " + MIN_NOTICE.toHours() + " hours ahead.");
        }
        if (start.isAfter(now.plus(MAX_AHEAD))) {
            throw new BusinessRuleException("INVALID_TIME", "Bookings can be made at most " + MAX_AHEAD.toDays() + " days ahead.");
        }
        ZonedDateTime localStart = start.atZone(tz());
        ZonedDateTime localEnd = end.atZone(tz());
        if (!localStart.toLocalDate().equals(localEnd.toLocalDate()) || localStart.toLocalTime().isBefore(OPENS)
                || localEnd.toLocalTime().isAfter(CLOSES) || localEnd.toLocalTime().equals(LocalTime.MIDNIGHT)) {
            throw new BusinessRuleException("OUTSIDE_WORKING_HOURS",
                    "Appointments run between " + OPENS + " and " + CLOSES + " (" + properties.timezone() + ").");
        }
    }

    @Transactional(readOnly = true)
    public PageView<BookingView> myBookings(UUID userId, Integer page, Integer size) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId)
                .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        return PageView.of(bookings.findByCustomerIdOrderByCreatedAtDesc(customerId,
                PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt")))), BookingView::of);
    }

    @Transactional
    public BookingView cancelMine(UUID id, UUID userId) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId)
                .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        ServiceBooking b = bookings.findById(id).orElseThrow(() -> new NotFoundException("Booking not found."));
        if (!customerId.equals(b.getCustomerId())) {
            throw new NotFoundException("Booking not found.");
        }
        if (!b.getStatus().isCustomerCancellable()) {
            throw new BusinessRuleException("CANNOT_CANCEL", "This booking can no longer be cancelled online.");
        }
        b.transition(BookingStatus.CANCELLED);
        audit.record(userId, "SERVICE_BOOKING_CANCELLED", "ServiceBooking", id, b.getReference());
        bookings.flush();
        return BookingView.of(b);
    }

    // ------------------------------------------------------------------ staff

    @Transactional(readOnly = true)
    public PageView<BookingView> list(BookingStatus status, Integer page, Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.asc("scheduledStart"), Sort.Order.asc("id")));
        var result = status == null ? bookings.findAll(request) : bookings.findByStatus(status, request);
        return PageView.of(result, BookingView::of);
    }

    @Transactional
    public BookingView update(UUID id, BookingStatus status, UUID actor) {
        ServiceBooking b = bookings.findById(id).orElseThrow(() -> new NotFoundException("Booking not found."));
        BookingStatus previous = b.getStatus();
        b.transition(status);
        bookings.flush();
        if (previous != status) {
            audit.record(actor, "SERVICE_BOOKING_UPDATED", "ServiceBooking", id, previous + " -> " + status);
        }
        return BookingView.of(b);
    }

    @Transactional(readOnly = true)
    public CapacityView capacity() {
        return capacity.findById((short) 1).map(c -> new CapacityView(c.getMaxConcurrentJobs()))
                .orElse(new CapacityView(0));
    }

    @Transactional
    public CapacityView setCapacity(int maxConcurrentJobs, UUID actor) {
        WorkshopCapacity cap = capacity.findForUpdate()
                .orElseThrow(() -> new IllegalStateException("Workshop capacity is not configured."));
        int previous = cap.getMaxConcurrentJobs();
        cap.setMaxConcurrentJobs(maxConcurrentJobs);
        capacity.flush();
        audit.record(actor, "WORKSHOP_CAPACITY_CHANGED", "WorkshopCapacity", null, previous + " -> " + maxConcurrentJobs);
        return new CapacityView(maxConcurrentJobs);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
