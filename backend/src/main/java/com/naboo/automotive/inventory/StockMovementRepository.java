package com.naboo.automotive.inventory;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    List<StockMovement> findByAccessoryIdOrderByCreatedAtDesc(UUID accessoryId, Pageable pageable);
}
