package com.naboo.automotive.billing;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByInvoiceIdOrderByPaidAtAsc(UUID invoiceId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.invoice.id = :invoiceId")
    BigDecimal sumByInvoiceId(@Param("invoiceId") UUID invoiceId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.paidAt >= :since")
    BigDecimal sumSince(@Param("since") java.time.Instant since);
}
