package com.naboo.automotive.workshop;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface WorkshopCapacityRepository extends JpaRepository<WorkshopCapacity, Short> {

    /** Locks the capacity row for the duration of a booking transaction, serialising slot checks. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from WorkshopCapacity c where c.id = 1")
    Optional<WorkshopCapacity> findForUpdate();
}
