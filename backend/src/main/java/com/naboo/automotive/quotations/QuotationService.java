package com.naboo.automotive.quotations;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthService;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.Money;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.notifications.Notification.NotificationType;
import com.naboo.automotive.notifications.NotificationService;
import com.naboo.automotive.quotations.Quotation.QuotationStatus;
import com.naboo.automotive.quotations.QuotationTypes.QuotationRequestInput;
import com.naboo.automotive.quotations.QuotationTypes.QuotationView;
import com.naboo.automotive.quotations.QuotationTypes.QuoteInput;
import com.naboo.automotive.services.ServiceOffering;
import com.naboo.automotive.services.ServiceOfferingRepository;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;

@Service
public class QuotationService {

    private final QuotationRepository quotations;
    private final ServiceOfferingRepository services;
    private final CustomerRepository customers;
    private final AuditService audit;
    private final NotificationService notifications;
    private final AppProperties properties;
    private final Clock clock = Clock.systemUTC();

    public QuotationService(QuotationRepository quotations, ServiceOfferingRepository services,
            CustomerRepository customers, AuditService audit, NotificationService notifications,
            AppProperties properties) {
        this.quotations = quotations;
        this.services = services;
        this.customers = customers;
        this.audit = audit;
        this.notifications = notifications;
        this.properties = properties;
    }

    private LocalDate today() {
        return LocalDate.now(ZoneId.of(properties.timezone()));
    }

    // ------------------------------------------------------------------ public

    @Transactional
    public EnquiryReceipt request(QuotationRequestInput input, UUID userId) {
        ServiceOffering service = input.serviceId() == null ? null
                : services.findById(input.serviceId()).filter(ServiceOffering::isActive)
                        .orElseThrow(() -> new NotFoundException("Service not found."));

        if (input.requestToken() != null) {
            var existing = quotations.findByRequestToken(input.requestToken());
            if (existing.isPresent()) {
                return receipt(existing.get(), true);
            }
        }

        UUID customerId = userId == null ? null : customers.findByUserId(userId).map(Customer::getId).orElse(null);
        Quotation q = new Quotation(Identifiers.reference("QTE"), input.requestToken(), service, customerId, userId,
                input.fullName().trim(), AuthService.normaliseEmail(input.email()), input.phone().trim(), input.workType(),
                input.vehicleDescription().trim(), input.description().trim(), properties.currency());
        try {
            quotations.saveAndFlush(q);
        } catch (DataIntegrityViolationException e) {
            if (input.requestToken() != null) {
                var existing = quotations.findByRequestToken(input.requestToken());
                if (existing.isPresent()) {
                    return receipt(existing.get(), true);
                }
            }
            throw e;
        }
        audit.record(userId, "QUOTATION_REQUESTED", "Quotation", q.getId(), q.getReference());
        return receipt(q, false);
    }

    private static EnquiryReceipt receipt(Quotation q, boolean duplicate) {
        return new EnquiryReceipt(q.getReference(), duplicate
                ? "This request was already submitted. Your reference is unchanged."
                : "Quotation request received. We will inspect the details and send you a price.");
    }

    // ------------------------------------------------------------------ customer

    @Transactional(readOnly = true)
    public PageView<QuotationView> myQuotations(UUID userId, Integer page, Integer size) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId)
                .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        var result = quotations.findByCustomerIdOrderByCreatedAtDesc(customerId,
                PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt"))));
        result.forEach(q -> q.expireIfNeeded(today()));
        return PageView.of(result, QuotationView::of);
    }

    @Transactional
    public QuotationView decideMine(UUID id, boolean accept, UUID userId) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId)
                .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        Quotation q = quotations.findById(id).orElseThrow(() -> new NotFoundException("Quotation not found."));
        if (!customerId.equals(q.getCustomerId())) {
            throw new NotFoundException("Quotation not found.");
        }
        q.decide(accept, clock.instant(), today());
        audit.record(userId, accept ? "QUOTATION_ACCEPTED" : "QUOTATION_DECLINED", "Quotation", id, q.getReference());
        quotations.flush();
        return QuotationView.of(q);
    }

    // ------------------------------------------------------------------ staff

    @Transactional(readOnly = true)
    public PageView<QuotationView> list(QuotationStatus status, Integer page, Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        var result = status == null ? quotations.findAll(request) : quotations.findByStatus(status, request);
        result.forEach(q -> q.expireIfNeeded(today()));
        return PageView.of(result, QuotationView::of);
    }

    @Transactional
    public QuotationView quote(UUID id, QuoteInput input, UUID actor) {
        Quotation q = quotations.findById(id).orElseThrow(() -> new NotFoundException("Quotation not found."));
        q.quote(Money.parseAmount(input.quotedAmount(), "quotedAmount"), input.validUntil(),
                blankToNull(input.staffNotes()), actor, today());
        audit.record(actor, "QUOTATION_PRICED", "Quotation", id, q.getReference() + " " + q.getQuotedAmount());
        notifications.notifyCustomer(q.getCustomerId(), NotificationType.QUOTATION_READY,
                "Your quotation " + q.getReference() + " is ready",
                "Quoted " + q.getQuotedAmount() + " " + q.getCurrency() + " — valid until " + q.getValidUntil()
                        + ". Review it in your account.",
                "/my-account", "Quotation", id);
        quotations.flush();
        return QuotationView.of(q);
    }

    @Transactional
    public QuotationView cancel(UUID id, UUID actor) {
        Quotation q = quotations.findById(id).orElseThrow(() -> new NotFoundException("Quotation not found."));
        q.cancel();
        audit.record(actor, "QUOTATION_CANCELLED", "Quotation", id, q.getReference());
        notifications.notifyCustomer(q.getCustomerId(), NotificationType.QUOTATION_READY,
                "Quotation " + q.getReference() + " withdrawn",
                "Your quotation request was withdrawn by our team. Contact us if this is unexpected.",
                "/my-account", "Quotation", id);
        quotations.flush();
        return QuotationView.of(q);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
