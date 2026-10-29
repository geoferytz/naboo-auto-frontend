package com.naboo.automotive.vehicles;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.naboo.automotive.auth.AuthInputs;
import com.naboo.automotive.vehicles.VehicleTypes.BodyType;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryType;
import com.naboo.automotive.vehicles.VehicleTypes.FuelType;
import com.naboo.automotive.vehicles.VehicleTypes.Transmission;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleCondition;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class VehicleInputs {

    private VehicleInputs() {
    }

    public record VehicleFilter(
            @Size(max = 100) String search,
            @Size(max = 60) String make,
            @Size(max = 60) String model,
            Integer minYear,
            Integer maxYear,
            @Size(max = 20) String minPrice,
            @Size(max = 20) String maxPrice,
            Integer maxMileageKm,
            FuelType fuelType,
            Transmission transmission,
            BodyType bodyType,
            VehicleCondition condition,
            Boolean includeSold) {
    }

    public record VehicleInput(
            @NotBlank @Size(max = 60) String make,
            @NotBlank @Size(max = 60) String model,
            @Size(max = 80) String variant,
            @NotNull @Min(1950) @Max(2100) Integer year,
            @PositiveOrZero Integer mileageKm,
            @NotNull FuelType fuelType,
            @NotNull Transmission transmission,
            @NotNull BodyType bodyType,
            @Size(max = 40) String color,
            @NotNull VehicleCondition condition,
            @Positive Integer engineCapacityCc,
            @Size(max = 30) String engineCode,
            @Size(max = 80) String location,
            @Size(max = 10000) String description,
            @Size(max = 20) String registrationNumber,
            @NotBlank @Size(max = 20) String priceAmount,
            @Size(max = 40) List<@NotBlank @Size(max = 80) String> features) {
    }

    public record VehicleImageInput(@NotBlank @Size(max = 500) String url, @NotBlank @Size(max = 200) String altText,
            @PositiveOrZero Integer sortOrder) {
    }

    public record VehicleEnquiryInput(
            @NotNull UUID vehicleId,
            @NotNull EnquiryType type,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = AuthInputs.PHONE_PATTERN, message = "must be a valid phone number") String phone,
            @Size(max = 2000) String message,
            Instant preferredViewingAt) {
    }

    public record UpdateEnquiryInput(@NotNull VehicleTypes.EnquiryStatus status, UUID assignedToUserId) {
    }

    public record AdminVehicleFilter(@Size(max = 100) String search, VehicleStatus status, Boolean published) {
    }
}
