package com.naboo.automotive.inventory;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.naboo.automotive.inventory.InventoryTypes.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, UUID>, JpaSpecificationExecutor<Order> {

    Optional<Order> findByRequestToken(UUID requestToken);

    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    Page<Order> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);
}
