package com.naboo.automotive.inventory;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.inventory.InventoryTypes.StockReason;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "accessory_id")
    private Accessory accessory;

    @Column(nullable = false)
    private int delta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockReason reason;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected StockMovement() {
    }

    public StockMovement(Accessory accessory, int delta, StockReason reason, UUID orderId, UUID actorUserId, String note) {
        this.accessory = accessory;
        this.delta = delta;
        this.reason = reason;
        this.orderId = orderId;
        this.actorUserId = actorUserId;
        this.note = note;
    }

    public UUID getId() {
        return id;
    }

    public int getDelta() {
        return delta;
    }

    public StockReason getReason() {
        return reason;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public UUID getActorUserId() {
        return actorUserId;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
