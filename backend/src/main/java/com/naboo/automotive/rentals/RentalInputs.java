package com.naboo.automotive.rentals;

import java.time.LocalDate;
import java.util.UUID;

import com.naboo.automotive.auth.AuthInputs;
import com.naboo.automotive.rentals.RentalTypes.RentalVehicleStatus;
import com.naboo.automotive.rentals.RentalTypes.ReservationStatus;
import com.naboo.automotive.vehicles.VehicleTypes.BodyType;
import com.naboo.automotive.vehicles.VehicleTypes.FuelType;
import com.naboo.automotive.vehicles.VehicleTypes.Transmission;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class RentalInputs {

    private RentalInputs() {
    }

    public record RentalVehicleInput(
            @NotBlank @Size(max = 60) String make,
            @NotBlank @Size(max = 60) String model,
            @Size(max = 80) String variant,
            @NotNull @Min(1950) @Max(2100) Integer year,
            @Positive @Max(60) Integer seats,
            @NotNull FuelType fuelType,
            @NotNull Transmission transmission,
            @NotNull BodyType bodyType,
            @Size(max = 40) String color,
            @Size(max = 10000) String description,
            @Size(max = 20) String registrationNumber,
            @NotBlank @Size(max = 20) String dailyRateAmount,
            @Size(max = 20) String depositAmount) {
    }

    public record AdminRentalFilter(@Size(max = 100) String search, RentalVehicleStatus status, Boolean published) {
    }

    public record ReservationInput(
            @NotNull UUID rentalVehicleId,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = AuthInputs.PHONE_PATTERN, message = "must be a valid phone number") String phone,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            @Size(max = 2000) String notes,
            UUID requestToken) {
    }

    public record UpdateReservationInput(@NotNull ReservationStatus status) {
    }
}
