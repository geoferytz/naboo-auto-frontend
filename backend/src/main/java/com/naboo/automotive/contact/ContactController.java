package com.naboo.automotive.contact;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.ContextValue;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthInputs;
import com.naboo.automotive.auth.AuthService;
import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.config.ClientIpInterceptor;
import com.naboo.automotive.config.RateLimiter;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Controller
public class ContactController {

    public record ContactEnquiryInput(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @Pattern(regexp = AuthInputs.PHONE_PATTERN, message = "must be a valid phone number") String phone,
            @NotBlank @Size(max = 150) String subject,
            @NotBlank @Size(max = 4000) String message) {
    }

    public record ContactEnquiryView(UUID id, String reference, String fullName, String email, String phone, String subject,
            String message, ContactEnquiry.Status status, Instant createdAt) {
        static ContactEnquiryView of(ContactEnquiry e) {
            return new ContactEnquiryView(e.getId(), e.getReference(), e.getFullName(), e.getEmail(), e.getPhone(),
                    e.getSubject(), e.getMessage(), e.getStatus(), e.getCreatedAt());
        }
    }

    private final ContactEnquiryRepository repository;
    private final CustomerRepository customers;
    private final AuditService audit;
    private final RateLimiter rateLimiter;

    public ContactController(ContactEnquiryRepository repository, CustomerRepository customers, AuditService audit,
            RateLimiter rateLimiter) {
        this.repository = repository;
        this.customers = customers;
        this.audit = audit;
        this.rateLimiter = rateLimiter;
    }

    @MutationMapping
    @Transactional
    public EnquiryReceipt submitContactEnquiry(@Argument @Valid ContactEnquiryInput input, @AuthenticationPrincipal Jwt jwt,
            @ContextValue(name = ClientIpInterceptor.CLIENT_IP, required = false) String clientIp) {
        rateLimiter.check("contact", clientIp);
        UUID userId = CurrentUser.id(jwt);
        UUID customerId = userId == null ? null : customers.findByUserId(userId).map(Customer::getId).orElse(null);
        String phone = input.phone() == null || input.phone().isBlank() ? null : input.phone().trim();
        ContactEnquiry enquiry = repository.save(new ContactEnquiry(Identifiers.reference("CON"), customerId,
                input.fullName().trim(), AuthService.normaliseEmail(input.email()), phone, input.subject().trim(),
                input.message().trim()));
        audit.record(userId, "CONTACT_ENQUIRY_CREATED", "ContactEnquiry", enquiry.getId(), enquiry.getReference());
        return new EnquiryReceipt(enquiry.getReference(), "Thank you. We have received your message and will reply soon.");
    }

    @QueryMapping
    @PreAuthorize(Permissions.CONTACT_ENQUIRY_VIEW)
    @Transactional(readOnly = true)
    public PageView<ContactEnquiryView> contactEnquiries(@Argument ContactEnquiry.Status status, @Argument Integer page,
            @Argument Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        var result = status == null ? repository.findAll(request) : repository.findByStatus(status, request);
        return PageView.of(result, ContactEnquiryView::of);
    }

    @MutationMapping
    @PreAuthorize(Permissions.CONTACT_ENQUIRY_VIEW)
    @Transactional
    public ContactEnquiryView updateContactEnquiryStatus(@Argument UUID id, @Argument ContactEnquiry.Status status,
            @AuthenticationPrincipal Jwt jwt) {
        ContactEnquiry enquiry = repository.findById(id).orElseThrow(() -> new NotFoundException("Enquiry not found."));
        String details = enquiry.getStatus() + " -> " + status;
        enquiry.setStatus(status);
        audit.record(CurrentUser.id(jwt), "CONTACT_ENQUIRY_UPDATED", "ContactEnquiry", id, details);
        repository.flush();
        return ContactEnquiryView.of(enquiry);
    }
}
