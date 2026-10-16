package com.naboo.automotive.vehicles;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthService;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.users.Role;
import com.naboo.automotive.users.UserRepository;
import com.naboo.automotive.vehicles.VehicleInputs.UpdateEnquiryInput;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleEnquiryInput;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryStatus;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryType;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;
import com.naboo.automotive.vehicles.VehicleViews.SalesEnquiryView;

@Service
public class VehicleEnquiryService {

    static final Duration MIN_VIEWING_NOTICE = Duration.ofHours(2);
    static final Duration MAX_VIEWING_AHEAD = Duration.ofDays(90);

    private final VehicleEnquiryRepository enquiries;
    private final VehicleRepository vehicles;
    private final CustomerRepository customers;
    private final UserRepository users;
    private final AuditService audit;
    private final Clock clock;

    public VehicleEnquiryService(VehicleEnquiryRepository enquiries, VehicleRepository vehicles,
            CustomerRepository customers, UserRepository users, AuditService audit) {
        this.enquiries = enquiries;
        this.vehicles = vehicles;
        this.customers = customers;
        this.users = users;
        this.audit = audit;
        this.clock = Clock.systemUTC();
    }

    /** General enquiries are accepted for available or reserved listings; viewings only for available ones. */
    public static boolean acceptsEnquiries(Vehicle v, EnquiryType type) {
        if (!v.isPubliclyVisible()) {
            return false;
        }
        return type == EnquiryType.VIEWING ? v.getStatus() == VehicleStatus.AVAILABLE
                : v.getStatus() == VehicleStatus.AVAILABLE || v.getStatus() == VehicleStatus.RESERVED;
    }

    @Transactional
    public EnquiryReceipt submit(VehicleEnquiryInput input, UUID userId) {
        Vehicle vehicle = vehicles.findById(input.vehicleId()).filter(Vehicle::isPubliclyVisible)
                .orElseThrow(() -> new NotFoundException("Vehicle not found."));
        if (!acceptsEnquiries(vehicle, input.type())) {
            throw new BusinessRuleException("VEHICLE_NOT_AVAILABLE", input.type() == EnquiryType.VIEWING
                    ? "Viewings can only be requested for available vehicles."
                    : "This vehicle is no longer available.");
        }
        Instant viewingAt = null;
        if (input.type() == EnquiryType.VIEWING) {
            viewingAt = input.preferredViewingAt();
            Instant now = clock.instant();
            if (viewingAt == null) {
                throw new BusinessRuleException("VIEWING_TIME_REQUIRED", "Please choose a preferred viewing date and time.");
            }
            if (viewingAt.isBefore(now.plus(MIN_VIEWING_NOTICE)) || viewingAt.isAfter(now.plus(MAX_VIEWING_AHEAD))) {
                throw new BusinessRuleException("INVALID_VIEWING_TIME",
                        "Viewing time must be at least 2 hours from now and within the next 90 days.");
            }
        }
        UUID customerId = userId == null ? null : customers.findByUserId(userId).map(Customer::getId).orElse(null);
        VehicleEnquiry enquiry = enquiries.save(new VehicleEnquiry(Identifiers.reference("ENQ"), vehicle, customerId,
                input.type(), input.fullName().trim(), AuthService.normaliseEmail(input.email()), input.phone().trim(),
                blankToNull(input.message()), viewingAt));
        audit.record(userId, "VEHICLE_ENQUIRY_CREATED", "VehicleEnquiry", enquiry.getId(), enquiry.getReference());
        return new EnquiryReceipt(enquiry.getReference(), input.type() == EnquiryType.VIEWING
                ? "Viewing request received. Our sales team will contact you to confirm the appointment."
                : "Enquiry received. Our sales team will contact you shortly.");
    }

    @Transactional(readOnly = true)
    public PageView<SalesEnquiryView> list(EnquiryStatus status, Integer page, Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        var result = status == null ? enquiries.findAllBy(request) : enquiries.findByStatus(status, request);
        return PageView.of(result, SalesEnquiryView::of);
    }

    @Transactional
    public SalesEnquiryView update(UUID id, UpdateEnquiryInput input, UUID actor) {
        VehicleEnquiry enquiry = enquiries.findById(id).orElseThrow(() -> new NotFoundException("Enquiry not found."));
        if (input.assignedToUserId() != null) {
            boolean assignable = users.findById(input.assignedToUserId())
                    .filter(u -> u.isEnabled() && (u.getRoles().contains(Role.SALES_AGENT) || u.getRoles().contains(Role.MANAGER)
                            || u.getRoles().contains(Role.SUPER_ADMIN)))
                    .isPresent();
            if (!assignable) {
                throw new BusinessRuleException("INVALID_ASSIGNEE", "Enquiries can only be assigned to active sales staff.");
            }
        }
        String details = enquiry.getStatus() + " -> " + input.status() + ", assignee=" + input.assignedToUserId();
        enquiry.update(input.status(), input.assignedToUserId());
        audit.record(actor, "VEHICLE_ENQUIRY_UPDATED", "VehicleEnquiry", id, details);
        enquiries.flush();
        return SalesEnquiryView.of(enquiry);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
