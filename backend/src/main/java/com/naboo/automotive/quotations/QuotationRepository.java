package com.naboo.automotive.quotations;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.naboo.automotive.quotations.Quotation.QuotationStatus;

public interface QuotationRepository extends JpaRepository<Quotation, UUID> {

    Optional<Quotation> findByRequestToken(UUID requestToken);

    Page<Quotation> findByStatus(QuotationStatus status, Pageable pageable);

    Page<Quotation> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    long countByStatusIn(List<QuotationStatus> statuses);
}
