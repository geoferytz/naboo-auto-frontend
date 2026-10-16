package com.naboo.automotive.quotations;

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
import com.naboo.automotive.quotations.Quotation.QuotationStatus;
import com.naboo.automotive.quotations.QuotationTypes.QuotationRequestInput;
import com.naboo.automotive.quotations.QuotationTypes.QuotationView;
import com.naboo.automotive.quotations.QuotationTypes.QuoteInput;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;

import jakarta.validation.Valid;

@Controller
@Validated
public class QuotationController {

    private final QuotationService quotationService;

    public QuotationController(QuotationService quotationService) {
        this.quotationService = quotationService;
    }

    // ------------------------------------------------------------------ public

    @MutationMapping
    public EnquiryReceipt requestQuotation(@Argument @Valid QuotationRequestInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return quotationService.request(input, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ customer

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public PageView<QuotationView> myQuotations(@AuthenticationPrincipal Jwt jwt, @Argument Integer page,
            @Argument Integer size) {
        return quotationService.myQuotations(CurrentUser.id(jwt), page, size);
    }

    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public QuotationView decideQuotation(@Argument UUID id, @Argument boolean accept, @AuthenticationPrincipal Jwt jwt) {
        return quotationService.decideMine(id, accept, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ staff

    @QueryMapping
    @PreAuthorize(Permissions.QUOTATION_MANAGE)
    public PageView<QuotationView> quotations(@Argument QuotationStatus status, @Argument Integer page,
            @Argument Integer size) {
        return quotationService.list(status, page, size);
    }

    @MutationMapping
    @PreAuthorize(Permissions.QUOTATION_MANAGE)
    public QuotationView priceQuotation(@Argument UUID id, @Argument @Valid QuoteInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return quotationService.quote(id, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.QUOTATION_MANAGE)
    public QuotationView cancelQuotation(@Argument UUID id, @AuthenticationPrincipal Jwt jwt) {
        return quotationService.cancel(id, CurrentUser.id(jwt));
    }
}
