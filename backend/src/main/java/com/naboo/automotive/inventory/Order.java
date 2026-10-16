package com.naboo.automotive.inventory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.inventory.InventoryTypes.OrderStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(name = "request_token", unique = true)
    private UUID requestToken;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    private String notes;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected Order() {
    }

    public Order(String reference, UUID requestToken, UUID customerId, String fullName, String email, String phone,
            BigDecimal total, String currency, String notes) {
        this.reference = reference;
        this.requestToken = requestToken;
        this.customerId = customerId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.totalAmount = total;
        this.currency = currency;
        this.notes = notes;
        this.status = OrderStatus.PENDING;
    }

    public void addItem(OrderItem item) {
        items.add(item);
    }

    public void transition(OrderStatus next) {
        if (!status.canTransitionTo(next)) {
            throw InventoryTypes.invalidTransition(status, next);
        }
        this.status = next;
    }

    public UUID getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getNotes() {
        return notes;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
