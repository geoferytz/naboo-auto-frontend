package com.naboo.automotive.rentals;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.naboo.automotive.common.Money;
import com.naboo.automotive.rentals.RentalTypes.RentalVehicleStatus;
import com.naboo.automotive.rentals.RentalTypes.ReservationStatus;
import com.naboo.automotive.vehicles.VehicleTypes.BodyType;
import com.naboo.automotive.vehicles.VehicleTypes.FuelType;
import com.naboo.automotive.vehicles.VehicleTypes.Transmission;
import com.naboo.automotive.vehicles.VehicleViews.ImageView;

public final class RentalViews {

    private RentalViews() {
    }

    /** {@code registrationNumber} is populated only for staff views. */
    public record RentalVehicleView(UUID id, String slug, String title, String make, String model, String variant,
            int year, Integer seats, FuelType fuelType, Transmission transmission, BodyType bodyType, String color,
            String location, String description, Money dailyRate, Money deposit, RentalVehicleStatus status,
            boolean published, List<ImageView> images, Instant publishedAt, Instant createdAt, Instant updatedAt,
            String registrationNumber) {

        static RentalVehicleView of(RentalVehicle v, boolean staff) {
            return new RentalVehicleView(v.getId(), v.getSlug(), v.title(), v.getMake(), v.getModel(), v.getVariant(),
                    v.getModelYear(), v.getSeats(), v.getFuelType(), v.getTransmission(), v.getBodyType(), v.getColor(),
                    v.getLocation(), v.getDescription(), Money.of(v.getDailyRateAmount(), v.getCurrency()),
                    Money.of(v.getDepositAmount(), v.getCurrency()), v.getStatus(), v.isPublished(),
                    v.getImages().stream().map(i -> new ImageView(i.getId(), i.getUrl(), i.getAltText(), i.getSortOrder())).toList(),
                    v.getPublishedAt(), v.getCreatedAt(), v.getUpdatedAt(), staff ? v.getRegistrationNumber() : null);
        }
    }

    /** Result of checking whether a vehicle can be rented for [startDate, endDate). */
    public record AvailabilityView(boolean available, int days, Money dailyRate, Money total) {
    }

    public record RentalVehicleSummary(UUID id, String slug, String title) {
        static RentalVehicleSummary of(RentalVehicle v) {
            return new RentalVehicleSummary(v.getId(), v.getSlug(), v.title());
        }
    }

    public record ReservationView(UUID id, String reference, RentalVehicleSummary vehicle, String fullName, String email,
            String phone, LocalDate startDate, LocalDate endDate, int days, ReservationStatus status, Money dailyRate,
            Money total, String notes, Instant createdAt) {

        static ReservationView of(RentalReservation r) {
            return new ReservationView(r.getId(), r.getReference(), RentalVehicleSummary.of(r.getVehicle()), r.getFullName(),
                    r.getEmail(), r.getPhone(), r.getStartDate(), r.getEndDate(), r.days(), r.getStatus(),
                    Money.of(r.getDailyRateAmount(), r.getCurrency()), Money.of(r.getTotalAmount(), r.getCurrency()),
                    r.getNotes(), r.getCreatedAt());
        }
    }
}
