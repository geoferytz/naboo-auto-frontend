package com.naboo.automotive.billing;

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
import com.naboo.automotive.billing.BillingTypes.InvoiceInput;
import com.naboo.automotive.billing.BillingTypes.InvoiceItemInput;
import com.naboo.automotive.billing.BillingTypes.InvoiceView;
import com.naboo.automotive.billing.BillingTypes.PaymentInput;
import com.naboo.automotive.billing.Invoice.InvoiceStatus;
import com.naboo.automotive.common.PageView;

import jakarta.validation.Valid;

@Controller
@Validated
public class BillingController {

    private final BillingService billing;

    public BillingController(BillingService billing) {
        this.billing = billing;
    }

    // ------------------------------------------------------------------ customer

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public PageView<InvoiceView> myInvoices(@AuthenticationPrincipal Jwt jwt, @Argument Integer page,
            @Argument Integer size) {
        return billing.myInvoices(CurrentUser.id(jwt), page, size);
    }

    // ------------------------------------------------------------------ staff

    @QueryMapping
    @PreAuthorize(Permissions.BILLING_MANAGE)
    public PageView<InvoiceView> invoices(@Argument InvoiceStatus status, @Argument Integer page, @Argument Integer size) {
        return billing.list(status, page, size);
    }

    @QueryMapping
    @PreAuthorize(Permissions.BILLING_MANAGE)
    public InvoiceView invoice(@Argument UUID id) {
        return billing.get(id);
    }

    @MutationMapping
    @PreAuthorize(Permissions.BILLING_MANAGE)
    public InvoiceView createInvoice(@Argument @Valid InvoiceInput input, @AuthenticationPrincipal Jwt jwt) {
        return billing.create(input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.BILLING_MANAGE)
    public InvoiceView addInvoiceItem(@Argument UUID invoiceId, @Argument @Valid InvoiceItemInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return billing.addItem(invoiceId, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.BILLING_MANAGE)
    public InvoiceView removeInvoiceItem(@Argument UUID invoiceId, @Argument UUID itemId,
            @AuthenticationPrincipal Jwt jwt) {
        return billing.removeItem(invoiceId, itemId, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.BILLING_MANAGE)
    public InvoiceView issueInvoice(@Argument UUID id, @AuthenticationPrincipal Jwt jwt) {
        return billing.issue(id, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.BILLING_MANAGE)
    public InvoiceView voidInvoice(@Argument UUID id, @AuthenticationPrincipal Jwt jwt) {
        return billing.voidInvoice(id, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.BILLING_MANAGE)
    public InvoiceView recordPayment(@Argument UUID invoiceId, @Argument @Valid PaymentInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return billing.recordPayment(invoiceId, input, CurrentUser.id(jwt));
    }
}
