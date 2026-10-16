package com.naboo.automotive.billing;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.naboo.automotive.billing.Invoice.InvoiceStatus;

import jakarta.persistence.LockModeType;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);

    Page<Invoice> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    /** Locks the invoice row while a payment is validated and applied. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invoice i where i.id = :id")
    Optional<Invoice> findForUpdate(@Param("id") UUID id);
}
