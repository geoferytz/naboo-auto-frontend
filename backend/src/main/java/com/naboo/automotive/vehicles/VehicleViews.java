package com.naboo.automotive.vehicles;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.naboo.automotive.common.Money;
import com.naboo.automotive.vehicles.VehicleTypes.BodyType;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryStatus;
import com.naboo.automotive.vehicles.VehicleTypes.EnquiryType;
import com.naboo.automotive.vehicles.VehicleTypes.FuelType;
import com.naboo.automotive.vehicles.VehicleTypes.Transmission;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleCondition;
import com.naboo.automotive.vehicles.VehicleTypes.VehicleStatus;

public final class VehicleViews {

    private VehicleViews() {
    }

    public record ImageView(UUID id, String url, String altText, int sortOrder) {
    }

    public record StatusChangeView(VehicleStatus fromStatus, VehicleStatus toStatus, Instant changedAt) {
    }

    /**
     * Vehicle projection. {@code registrationNumber} and {@code statusHistory} are populated only for staff views.
     */
    public record VehicleView(UUID id, String slug, String title, String make, String model, String variant, int year,
            Integer mileageKm, FuelType fuelType, Transmission transmission, BodyType bodyType, String color,
            VehicleCondition condition, Integer engineCapacityCc, String engineCode, String location, String description,
            Money price, VehicleStatus status,
            boolean published, boolean enquiriesOpen, boolean viewingsOpen, List<String> features, List<ImageView> images,
            Instant publishedAt, Instant createdAt, Instant updatedAt, String registrationNumber,
            List<StatusChangeView> statusHistory) {

        static VehicleView of(Vehicle v, boolean staff, List<StatusChangeView> history) {
            return new VehicleView(v.getId(), v.getSlug(), v.title(), v.getMake(), v.getModel(), v.getVariant(),
                    v.getModelYear(), v.getMileageKm(), v.getFuelType(), v.getTransmission(), v.getBodyType(),
                    v.getColor(), v.getCondition(), v.getEngineCapacityCc(), v.getEngineCode(), v.getLocation(),
                    v.getDescription(),
                    Money.of(v.getPriceAmount(), v.getCurrency()), v.getStatus(), v.isPublished(),
                    VehicleEnquiryService.acceptsEnquiries(v, EnquiryType.GENERAL),
                    VehicleEnquiryService.acceptsEnquiries(v, EnquiryType.VIEWING),
                    List.copyOf(v.getFeatures()),
                    v.getImages().stream().map(i -> new ImageView(i.getId(), i.getUrl(), i.getAltText(), i.getSortOrder())).toList(),
                    v.getPublishedAt(), v.getCreatedAt(), v.getUpdatedAt(),
                    staff ? v.getRegistrationNumber() : null, staff ? history : null);
        }
    }

    public record VehicleSummary(UUID id, String slug, String title, VehicleStatus status) {
    }

    public record SalesEnquiryView(UUID id, String reference, VehicleSummary vehicle, EnquiryType type, String fullName,
            String email, String phone, String message, Instant preferredViewingAt, EnquiryStatus status,
            UUID assignedToUserId, Instant createdAt) {

        static SalesEnquiryView of(VehicleEnquiry e) {
            Vehicle v = e.getVehicle();
            return new SalesEnquiryView(e.getId(), e.getReference(),
                    new VehicleSummary(v.getId(), v.getSlug(), v.title(), v.getStatus()), e.getType(), e.getFullName(),
                    e.getEmail(), e.getPhone(), e.getMessage(), e.getPreferredViewingAt(), e.getStatus(),
                    e.getAssignedToUserId(), e.getCreatedAt());
        }
    }

    public record EnquiryReceipt(String reference, String message) {
    }
}
