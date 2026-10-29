package com.naboo.automotive.vehicles;

import java.util.List;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.ContextValue;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;

import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.config.ClientIpInterceptor;
import com.naboo.automotive.config.RateLimiter;
import com.naboo.automotive.vehicles.VehicleInputs.AdminVehicleFilter;
import com.naboo.automotive.vehicles.VehicleInputs.UpdateEnquiryInput;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleEnquiryInput;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleFilter;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleImageInput;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleInput;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryStatus;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleSort;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;
import com.naboo.automotive.vehicles.VehicleViews.SalesEnquiryView;
import com.naboo.automotive.vehicles.VehicleViews.VehicleView;

import jakarta.validation.Valid;

@Controller
public class VehicleController {

    private final VehicleService vehicleService;
    private final VehicleEnquiryService enquiryService;
    private final RateLimiter rateLimiter;

    public VehicleController(VehicleService vehicleService, VehicleEnquiryService enquiryService, RateLimiter rateLimiter) {
        this.vehicleService = vehicleService;
        this.enquiryService = enquiryService;
        this.rateLimiter = rateLimiter;
    }

    // ------------------------------------------------------------------ public

    @QueryMapping
    public PageView<VehicleView> vehicles(@Argument @Valid VehicleFilter filter, @Argument Integer page,
            @Argument Integer size, @Argument VehicleSort sort) {
        return vehicleService.searchPublic(filter, page, size, sort);
    }

    @QueryMapping
    public VehicleView vehicleBySlug(@Argument String slug) {
        return vehicleService.findPublicBySlug(slug);
    }

    @QueryMapping
    public List<String> vehicleMakes() {
        return vehicleService.publicMakes();
    }

    @QueryMapping
    public List<com.naboo.automotive.common.VehicleSearchOption> vehicleSearchOptions() {
        return vehicleService.searchOptions();
    }

    @MutationMapping
    public EnquiryReceipt submitVehicleEnquiry(@Argument @Valid VehicleEnquiryInput input, @AuthenticationPrincipal Jwt jwt,
            @ContextValue(name = ClientIpInterceptor.CLIENT_IP, required = false) String clientIp) {
        rateLimiter.check("vehicle-enquiry", clientIp);
        return enquiryService.submit(input, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ staff

    @QueryMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public PageView<VehicleView> adminVehicles(@Argument @Valid AdminVehicleFilter filter, @Argument Integer page,
            @Argument Integer size) {
        return vehicleService.searchAdmin(filter, page, size);
    }

    @QueryMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public VehicleView adminVehicle(@Argument UUID id) {
        return vehicleService.getForStaff(id);
    }

    @QueryMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public PageView<SalesEnquiryView> salesEnquiries(@Argument EnquiryStatus status, @Argument Integer page,
            @Argument Integer size) {
        return enquiryService.list(status, page, size);
    }

    @MutationMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public VehicleView createVehicle(@Argument @Valid VehicleInput input, @AuthenticationPrincipal Jwt jwt) {
        return vehicleService.create(input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public VehicleView updateVehicle(@Argument UUID id, @Argument @Valid VehicleInput input, @AuthenticationPrincipal Jwt jwt) {
        return vehicleService.update(id, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public VehicleView setVehicleStatus(@Argument UUID id, @Argument VehicleStatus status, @AuthenticationPrincipal Jwt jwt) {
        return vehicleService.setStatus(id, status, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public VehicleView setVehiclePublished(@Argument UUID id, @Argument boolean published, @AuthenticationPrincipal Jwt jwt) {
        return vehicleService.setPublished(id, published, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public VehicleView addVehicleImage(@Argument UUID vehicleId, @Argument @Valid VehicleImageInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return vehicleService.addImage(vehicleId, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public VehicleView removeVehicleImage(@Argument UUID vehicleId, @Argument UUID imageId, @AuthenticationPrincipal Jwt jwt) {
        return vehicleService.removeImage(vehicleId, imageId, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public VehicleView reorderVehicleImages(@Argument UUID vehicleId, @Argument List<UUID> imageIds,
            @AuthenticationPrincipal Jwt jwt) {
        return vehicleService.reorderImages(vehicleId, imageIds, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.VEHICLE_MANAGE)
    public SalesEnquiryView updateSalesEnquiry(@Argument UUID id, @Argument @Valid UpdateEnquiryInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return enquiryService.update(id, input, CurrentUser.id(jwt));
    }
}
