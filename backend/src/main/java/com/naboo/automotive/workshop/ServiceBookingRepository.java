package com.naboo.automotive.workshop;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.naboo.automotive.workshop.ServiceBooking.BookingStatus;

public interface ServiceBookingRepository
        extends JpaRepository<ServiceBooking, UUID>, JpaSpecificationExecutor<ServiceBooking> {

    Optional<ServiceBooking> findByRequestToken(UUID requestToken);

    Page<ServiceBooking> findByStatus(BookingStatus status, Pageable pageable);

    long countByStatus(BookingStatus status);

    Page<ServiceBooking> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    /** Bookings that occupy the workshop during [start, end). Only call while holding the capacity row lock. */
    @Query("select count(b) from ServiceBooking b where b.status in "
            + "(com.naboo.automotive.workshop.ServiceBooking.BookingStatus.PENDING,"
            + " com.naboo.automotive.workshop.ServiceBooking.BookingStatus.CONFIRMED,"
            + " com.naboo.automotive.workshop.ServiceBooking.BookingStatus.IN_PROGRESS) "
            + "and b.scheduledStart < :end and b.scheduledEnd > :start")
    long countBlockingOverlap(@Param("start") Instant start, @Param("end") Instant end);
}
