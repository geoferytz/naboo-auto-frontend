package com.naboo.automotive.rentals;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.naboo.automotive.rentals.RentalTypes.ReservationStatus;

public interface RentalReservationRepository
        extends JpaRepository<RentalReservation, UUID>, JpaSpecificationExecutor<RentalReservation> {

    Optional<RentalReservation> findByRequestToken(UUID requestToken);

    Page<RentalReservation> findByStatus(ReservationStatus status, Pageable pageable);

    long countByStatus(ReservationStatus status);

    Page<RentalReservation> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    /** Counts reservations that block [start, end) — mirrors the exclusion constraint for pre-checks. */
    @Query("select count(r) from RentalReservation r where r.vehicle.id = :vehicleId "
            + "and r.status in (com.naboo.automotive.rentals.RentalTypes.ReservationStatus.PENDING,"
            + " com.naboo.automotive.rentals.RentalTypes.ReservationStatus.CONFIRMED,"
            + " com.naboo.automotive.rentals.RentalTypes.ReservationStatus.ACTIVE) "
            + "and r.startDate < :end and r.endDate > :start")
    long countBlockingOverlap(@Param("vehicleId") UUID vehicleId, @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
