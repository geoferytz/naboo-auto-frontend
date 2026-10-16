package com.naboo.automotive.billing;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthService;
import com.naboo.automotive.billing.BillingTypes.InvoiceInput;
import com.naboo.automotive.billing.BillingTypes.InvoiceView;
import com.naboo.automotive.billing.BillingTypes.PaymentInput;
import com.naboo.automotive.billing.BillingTypes.PaymentView;
import com.naboo.automotive.billing.Invoice.InvoiceStatus;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.Money;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.notifications.Notification.NotificationType;
import com.naboo.automotive.notifications.NotificationService;

@Service
public class BillingService {

    private final InvoiceRepository invoices;
    private final PaymentRepository payments;
    private final CustomerRepository customers;
    private final AuditService audit;
    private final NotificationService notifications;
    private final AppProperties properties;
    private final Clock clock = Clock.systemUTC();

    public BillingService(InvoiceRepository invoices, PaymentRepository payments, CustomerRepository customers,
            AuditService audit, NotificationService notifications, AppProperties properties) {
        this.invoices = invoices;
        this.payments = payments;
        this.customers = customers;
        this.audit = audit;
        this.notifications = notifications;
        this.properties = properties;
    }

    // ------------------------------------------------------------------ customer

    @Transactional(readOnly = true)
    public PageView<InvoiceView> myInvoices(UUID userId, Integer page, Integer size) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId)
                .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        return PageView.of(invoices.findByCustomerIdOrderByCreatedAtDesc(customerId,
                PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt")))), this::view);
    }

    // ------------------------------------------------------------------ staff

    @Transactional(readOnly = true)
    public PageView<InvoiceView> list(InvoiceStatus status, Integer page, Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        var result = status == null ? invoices.findAll(request) : invoices.findByStatus(status, request);
        return PageView.of(result, this::view);
    }

    @Transactional(readOnly = true)
    public InvoiceView get(UUID id) {
        return view(load(id));
    }

    @Transactional
    public InvoiceView create(InvoiceInput input, UUID actor) {
        LocalDate due = input.dueDate();
        if (due != null && !due.isAfter(LocalDate.now(ZoneId.of(properties.timezone())))) {
            throw new BusinessRuleException("INVALID_DUE_DATE", "The due date must be in the future.");
        }
        UUID customerId = input.customerUserId() == null ? null
                : customers.findByUserId(input.customerUserId()).map(Customer::getId)
                        .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        Invoice invoice = new Invoice(Identifiers.reference("INV"), customerId, input.recipientName().trim(),
                AuthService.normaliseEmail(input.recipientEmail()), input.bookingId(), input.orderId(),
                input.quotationId(), properties.currency(), due, blankToNull(input.notes()));
        for (var line : input.items()) {
            invoice.addItem(new InvoiceItem(invoice, line.description().trim(), line.quantity(),
                    Money.parseAmount(line.unitPrice(), "unitPrice")));
        }
        invoices.saveAndFlush(invoice);
        audit.record(actor, "INVOICE_CREATED", "Invoice", invoice.getId(), invoice.getReference());
        return view(invoice);
    }

    @Transactional
    public InvoiceView addItem(UUID id, BillingTypes.InvoiceItemInput item, UUID actor) {
        Invoice invoice = load(id);
        invoice.addItem(new InvoiceItem(invoice, item.description().trim(), item.quantity(),
                Money.parseAmount(item.unitPrice(), "unitPrice")));
        audit.record(actor, "INVOICE_ITEM_ADDED", "Invoice", id, invoice.getReference());
        invoices.flush();
        return view(invoice);
    }

    @Transactional
    public InvoiceView removeItem(UUID id, UUID itemId, UUID actor) {
        Invoice invoice = load(id);
        invoice.removeItem(itemId);
        audit.record(actor, "INVOICE_ITEM_REMOVED", "Invoice", id, itemId.toString());
        invoices.flush();
        return view(invoice);
    }

    @Transactional
    public InvoiceView issue(UUID id, UUID actor) {
        Invoice invoice = load(id);
        invoice.issue(clock.instant());
        audit.record(actor, "INVOICE_ISSUED", "Invoice", id, invoice.getReference());
        notifications.notifyCustomer(invoice.getCustomerId(), NotificationType.INVOICE_ISSUED,
                "Invoice " + invoice.getReference() + " issued",
                "An invoice for " + invoice.getTotalAmount() + " " + invoice.getCurrency() + " is due"
                        + (invoice.getDueDate() != null ? " by " + invoice.getDueDate() : "") + ".",
                "/my-account", "Invoice", id);
        invoices.flush();
        return view(invoice);
    }

    @Transactional
    public InvoiceView voidInvoice(UUID id, UUID actor) {
        Invoice invoice = load(id);
        if (BigDecimal.ZERO.compareTo(payments.sumByInvoiceId(id)) != 0 && invoice.getStatus() != InvoiceStatus.PAID) {
            throw new BusinessRuleException("HAS_PAYMENTS", "An invoice with recorded payments cannot be voided.");
        }
        invoice.voidInvoice();
        audit.record(actor, "INVOICE_VOIDED", "Invoice", id, invoice.getReference());
        invoices.flush();
        return view(invoice);
    }

    @Transactional
    public InvoiceView recordPayment(UUID invoiceId, PaymentInput input, UUID actor) {
        Invoice invoice = invoices.findForUpdate(invoiceId)
                .orElseThrow(() -> new NotFoundException("Invoice not found."));
        invoice.requireIssuable();
        BigDecimal amount = Money.parseAmount(input.amount(), "amount");
        if (amount.signum() <= 0) {
            throw new BusinessRuleException("INVALID_AMOUNT", "The payment amount must be positive.");
        }
        BigDecimal paid = payments.sumByInvoiceId(invoiceId);
        BigDecimal remaining = invoice.getTotalAmount().subtract(paid);
        if (amount.compareTo(remaining) > 0) {
            throw new BusinessRuleException("OVERPAYMENT",
                    "This payment exceeds the outstanding balance of " + remaining + ".");
        }
        Payment payment = new Payment(invoice, amount, input.method(),
                input.paidAt() != null ? input.paidAt() : clock.instant(), actor, blankToNull(input.reference()),
                blankToNull(input.note()));
        payments.save(payment);
        BigDecimal newPaid = paid.add(amount);
        if (newPaid.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.markPaid(clock.instant());
            notifications.notifyCustomer(invoice.getCustomerId(), NotificationType.PAYMENT_CONFIRMED,
                    "Invoice " + invoice.getReference() + " paid in full",
                    "We received your payment(s) totalling " + newPaid + " " + invoice.getCurrency() + ". Thank you!",
                    "/my-account", "Invoice", invoiceId);
        }
        audit.record(actor, "PAYMENT_RECORDED", "Invoice", invoiceId, invoice.getReference() + " " + amount + " "
                + input.method());
        payments.flush();
        invoices.flush();
        return view(invoice);
    }

    private InvoiceView view(Invoice i) {
        var paid = payments.sumByInvoiceId(i.getId());
        var paymentViews = payments.findByInvoiceIdOrderByPaidAtAsc(i.getId()).stream().map(PaymentView::of).toList();
        return InvoiceView.of(i, paid, paymentViews);
    }

    private Invoice load(UUID id) {
        return invoices.findById(id).orElseThrow(() -> new NotFoundException("Invoice not found."));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
