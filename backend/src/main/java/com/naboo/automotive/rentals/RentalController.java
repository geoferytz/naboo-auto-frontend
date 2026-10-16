package com.naboo.automotive.rentals;

import java.time.LocalDate;
import java.util.List;
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
import com.naboo.automotive.rentals.RentalInputs.AdminRentalFilter;
import com.naboo.automotive.rentals.RentalInputs.RentalVehicleInput;
import com.naboo.automotive.rentals.RentalInputs.ReservationInput;
import com.naboo.automotive.rentals.RentalInputs.UpdateReservationInput;
import com.naboo.automotive.rentals.RentalTypes.RentalVehicleStatus;
import com.naboo.automotive.rentals.RentalTypes.ReservationStatus;
import com.naboo.automotive.rentals.RentalViews.AvailabilityView;
import com.naboo.automotive.rentals.RentalViews.RentalVehicleView;
import com.naboo.automotive.rentals.RentalViews.ReservationView;
import com.naboo.automotive.vehicles.VehicleInputs.VehicleImageInput;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;

import jakarta.validation.Valid;

@Controller
@Validated
public class RentalController {

    private final RentalService rentalService;

    public RentalController(RentalService rentalService) {
        this.rentalService = rentalService;
    }

    // ------------------------------------------------------------------ public

    @QueryMapping
    public PageView<RentalVehicleView> rentalVehicles(@Argument Integer page, @Argument Integer size) {
        return rentalService.searchPublic(page, size);
    }

    @QueryMapping
    public RentalVehicleView rentalVehicleBySlug(@Argument String slug) {
        return rentalService.findPublicBySlug(slug);
    }

    @QueryMapping
    public AvailabilityView rentalAvailability(@Argument UUID rentalVehicleId, @Argument LocalDate startDate,
            @Argument LocalDate endDate) {
        return rentalService.availability(rentalVehicleId, startDate, endDate);
    }

    @MutationMapping
    public EnquiryReceipt requestRental(@Argument @Valid ReservationInput input, @AuthenticationPrincipal Jwt jwt) {
        return rentalService.reserve(input, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ customer

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public PageView<ReservationView> myRentalReservations(@AuthenticationPrincipal Jwt jwt, @Argument Integer page,
            @Argument Integer size) {
        return rentalService.myReservations(CurrentUser.id(jwt), page, size);
    }

    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public ReservationView cancelMyReservation(@Argument UUID id, @AuthenticationPrincipal Jwt jwt) {
        return rentalService.cancelMine(id, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ staff

    @QueryMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public PageView<RentalVehicleView> adminRentalVehicles(@Argument AdminRentalFilter filter, @Argument Integer page,
            @Argument Integer size) {
        return rentalService.searchAdmin(filter, page, size);
    }

    @QueryMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public RentalVehicleView adminRentalVehicle(@Argument UUID id) {
        return rentalService.getForStaff(id);
    }

    @QueryMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public PageView<ReservationView> rentalReservations(@Argument ReservationStatus status, @Argument Integer page,
            @Argument Integer size) {
        return rentalService.listReservations(status, page, size);
    }

    @MutationMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public RentalVehicleView createRentalVehicle(@Argument @Valid RentalVehicleInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return rentalService.create(input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public RentalVehicleView updateRentalVehicle(@Argument UUID id, @Argument @Valid RentalVehicleInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return rentalService.update(id, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public RentalVehicleView setRentalVehicleStatus(@Argument UUID id, @Argument RentalVehicleStatus status,
            @AuthenticationPrincipal Jwt jwt) {
        return rentalService.setStatus(id, status, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public RentalVehicleView setRentalVehiclePublished(@Argument UUID id, @Argument boolean published,
            @AuthenticationPrincipal Jwt jwt) {
        return rentalService.setPublished(id, published, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public RentalVehicleView addRentalVehicleImage(@Argument UUID rentalVehicleId, @Argument @Valid VehicleImageInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return rentalService.addImage(rentalVehicleId, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public RentalVehicleView removeRentalVehicleImage(@Argument UUID rentalVehicleId, @Argument UUID imageId,
            @AuthenticationPrincipal Jwt jwt) {
        return rentalService.removeImage(rentalVehicleId, imageId, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public RentalVehicleView reorderRentalVehicleImages(@Argument UUID rentalVehicleId, @Argument List<UUID> imageIds,
            @AuthenticationPrincipal Jwt jwt) {
        return rentalService.reorderImages(rentalVehicleId, imageIds, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.RENTAL_MANAGE)
    public ReservationView updateRentalReservation(@Argument UUID id, @Argument @Valid UpdateReservationInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return rentalService.updateReservation(id, input.status(), CurrentUser.id(jwt));
    }
}
