package com.naboo.automotive.inventory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.inventory.InventoryTypes.AccessoryInput;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "accessories")
public class Accessory {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String name;

    private String category;

    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "price_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal priceAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "stock_quantity", nullable = false)
    private int stockQuantity;

    private boolean active;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    private long version;

    protected Accessory() {
    }

    public Accessory(String sku, String currency) {
        this.sku = sku;
        this.currency = currency;
    }

    public void apply(AccessoryInput in, BigDecimal price) {
        this.name = in.name().trim();
        this.category = blankToNull(in.category());
        this.description = blankToNull(in.description());
        this.imageUrl = blankToNull(in.imageUrl());
        this.priceAmount = price;
        this.active = in.active();
    }

    /** Applies a signed stock delta; stock can never go negative. */
    public void moveStock(int delta) {
        int next = stockQuantity + delta;
        if (next < 0) {
            throw new BusinessRuleException("INSUFFICIENT_STOCK",
                    "Only " + stockQuantity + " of '" + name + "' remain in stock.");
        }
        this.stockQuantity = next;
    }

    public void setStockQuantity(int stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    public UUID getId() {
        return id;
    }

    public String getSku() {
        return sku;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public BigDecimal getPriceAmount() {
        return priceAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public int getStockQuantity() {
        return stockQuantity;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
