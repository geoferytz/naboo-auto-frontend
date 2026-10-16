package com.naboo.automotive.vehicles;

public final class VehicleTypes {

    private VehicleTypes() {
    }

    public enum FuelType { PETROL, DIESEL, HYBRID, ELECTRIC, LPG }

    public enum Transmission { MANUAL, AUTOMATIC }

    public enum BodyType { SEDAN, HATCHBACK, SUV, PICKUP, VAN, COUPE, WAGON, OTHER }

    public enum VehicleCondition { NEW, FOREIGN_USED, LOCALLY_USED }

    public enum VehicleStatus {
        AVAILABLE, RESERVED, SOLD, UNAVAILABLE;

        /** Statuses that may appear on the public website when the listing is published. */
        public boolean isPubliclyListable() {
            return this != UNAVAILABLE;
        }
    }

    public enum VehicleSort { NEWEST, PRICE_ASC, PRICE_DESC, YEAR_DESC, MILEAGE_ASC }

    public enum EnquiryType { GENERAL, VIEWING }

    public enum EnquiryStatus { NEW, CONTACTED, VIEWING_SCHEDULED, CLOSED_WON, CLOSED_LOST }
}
