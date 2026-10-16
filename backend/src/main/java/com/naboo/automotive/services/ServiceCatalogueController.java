package com.naboo.automotive.services;

import java.util.List;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;

import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.services.ServiceCatalogue.CategoryInput;
import com.naboo.automotive.services.ServiceCatalogue.CategoryView;
import com.naboo.automotive.services.ServiceCatalogue.ServiceInput;
import com.naboo.automotive.services.ServiceCatalogue.ServiceView;

import jakarta.validation.Valid;

@Controller
public class ServiceCatalogueController {

    private final ServiceCatalogue catalogue;

    public ServiceCatalogueController(ServiceCatalogue catalogue) {
        this.catalogue = catalogue;
    }

    @QueryMapping
    public List<CategoryView> serviceCategories() {
        return catalogue.categories();
    }

    @QueryMapping
    public List<ServiceView> services(@Argument String categorySlug) {
        return catalogue.activeServices(categorySlug);
    }

    @QueryMapping
    public ServiceView serviceBySlug(@Argument String slug) {
        return catalogue.activeBySlug(slug);
    }

    @QueryMapping
    @PreAuthorize(Permissions.STAFF)
    public List<ServiceView> adminServices() {
        return catalogue.allServices();
    }

    @MutationMapping
    @PreAuthorize(Permissions.SERVICE_CATALOGUE_MANAGE)
    public CategoryView createServiceCategory(@Argument @Valid CategoryInput input, @AuthenticationPrincipal Jwt jwt) {
        return catalogue.createCategory(input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.SERVICE_CATALOGUE_MANAGE)
    public CategoryView updateServiceCategory(@Argument UUID id, @Argument @Valid CategoryInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return catalogue.updateCategory(id, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.SERVICE_CATALOGUE_MANAGE)
    public ServiceView createService(@Argument @Valid ServiceInput input, @AuthenticationPrincipal Jwt jwt) {
        return catalogue.createService(input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.SERVICE_CATALOGUE_MANAGE)
    public ServiceView updateService(@Argument UUID id, @Argument @Valid ServiceInput input, @AuthenticationPrincipal Jwt jwt) {
        return catalogue.updateService(id, input, CurrentUser.id(jwt));
    }
}
