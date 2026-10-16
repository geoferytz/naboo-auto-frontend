package com.naboo.automotive.inventory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "accessory_id")
    private Accessory accessory;

    @Column(nullable = false)
    private String description;

    @Column(name = "unit_price_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal unitPriceAmount;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "line_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal lineTotal;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected OrderItem() {
    }

    /** Unit price and description are snapshotted so later catalogue edits do not alter the order. */
    public OrderItem(Order order, Accessory accessory, int quantity) {
        this.order = order;
        this.accessory = accessory;
        this.description = accessory.getName();
        this.unitPriceAmount = accessory.getPriceAmount();
        this.quantity = quantity;
        this.lineTotal = accessory.getPriceAmount().multiply(BigDecimal.valueOf(quantity));
    }

    public UUID getId() {
        return id;
    }

    public Order getOrder() {
        return order;
    }

    public Accessory getAccessory() {
        return accessory;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getUnitPriceAmount() {
        return unitPriceAmount;
    }

    public int getQuantity() {
        return quantity;
    }

    public BigDecimal getLineTotal() {
        return lineTotal;
    }
}
