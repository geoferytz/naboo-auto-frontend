package com.naboo.automotive.rentals;

import java.util.EnumSet;
import java.util.Set;

public final class RentalTypes {

    private RentalTypes() {
    }

    public enum RentalVehicleStatus {
        AVAILABLE, UNAVAILABLE
    }

    /**
     * PENDING: request received, awaiting staff confirmation. CONFIRMED: staff accepted the booking.
     * ACTIVE: vehicle handed over. COMPLETED: returned. CANCELLED: no longer blocks dates.
     */
    public enum ReservationStatus {
        PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED;

        /** Statuses that hold the vehicle's calendar (must match the exclusion constraint). */
        public static final Set<ReservationStatus> BLOCKING = EnumSet.of(PENDING, CONFIRMED, ACTIVE);

        public boolean canTransitionTo(ReservationStatus next) {
            return switch (this) {
                case PENDING -> next == CONFIRMED || next == CANCELLED;
                case CONFIRMED -> next == ACTIVE || next == CANCELLED;
                case ACTIVE -> next == COMPLETED;
                case COMPLETED, CANCELLED -> false;
            };
        }

        /** A customer may withdraw a request while it still blocks the calendar but has not started. */
        public boolean isCustomerCancellable() {
            return this == PENDING || this == CONFIRMED;
        }
    }
}
