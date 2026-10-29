package com.naboo.automotive.inventory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.naboo.automotive.auth.AuthInputs;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Money;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class InventoryTypes {

    private InventoryTypes() {
    }

    public enum OrderStatus {
        PENDING, CONFIRMED, READY, COMPLETED, CANCELLED;

        public boolean canTransitionTo(OrderStatus next) {
            return switch (this) {
                case PENDING -> next == CONFIRMED || next == CANCELLED;
                case CONFIRMED -> next == READY || next == CANCELLED;
                case READY -> next == COMPLETED || next == CANCELLED;
                case COMPLETED, CANCELLED -> false;
            };
        }
    }

    public enum StockReason { ORDER_PLACED, ORDER_CANCELLED, ADJUSTMENT, RESTOCK }

    public record AccessoryInput(
            @Size(max = 30) String sku,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 60) String category,
            @Size(max = 4000) String description,
            @Size(max = 500) String imageUrl,
            @NotBlank @Size(max = 20) String priceAmount,
            @NotNull @Min(0) @Max(1_000_000) Integer stockQuantity,
            boolean active) {
    }

    public record StockAdjustInput(@NotNull Integer delta, @NotNull StockReason reason, @Size(max = 500) String note) {
        public StockAdjustInput {
            if (delta == 0) {
                throw new IllegalArgumentException("delta must not be zero");
            }
            if (reason == StockReason.ORDER_PLACED || reason == StockReason.ORDER_CANCELLED) {
                throw new IllegalArgumentException("Use order operations for order-driven stock changes");
            }
        }
    }

    public record OrderItemInput(@NotNull UUID accessoryId, @NotNull @Positive @Max(100) Integer quantity) {
    }

    public record OrderInput(
            @NotNull @Size(min = 1, max = 20) List<@Valid OrderItemInput> items,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = AuthInputs.PHONE_PATTERN, message = "must be a valid phone number") String phone,
            @Size(max = 2000) String notes,
            UUID requestToken) {
    }

    public record AccessoryView(UUID id, String sku, String name, String category, String description, String imageUrl,
            Money price, int stockQuantity, boolean active, boolean inStock, Instant createdAt) {

        static AccessoryView of(Accessory a) {
            return new AccessoryView(a.getId(), a.getSku(), a.getName(), a.getCategory(), a.getDescription(), a.getImageUrl(),
                    Money.of(a.getPriceAmount(), a.getCurrency()), a.getStockQuantity(), a.isActive(),
                    a.getStockQuantity() > 0, a.getCreatedAt());
        }
    }

    public record StockMovementView(UUID id, int delta, StockReason reason, UUID orderId, UUID actorUserId, String note,
            Instant createdAt) {
    }

    public record OrderItemView(UUID id, String description, Money unitPrice, int quantity, Money lineTotal) {
    }

    public record OrderView(UUID id, String reference, String fullName, String email, String phone, OrderStatus status,
            Money total, String notes, List<OrderItemView> items, Instant createdAt) {

        public static OrderView of(Order o) {
            return new OrderView(o.getId(), o.getReference(), o.getFullName(), o.getEmail(), o.getPhone(), o.getStatus(),
                    Money.of(o.getTotalAmount(), o.getCurrency()), o.getNotes(),
                    o.getItems().stream()
                            .map(i -> new OrderItemView(i.getId(), i.getDescription(),
                                    Money.of(i.getUnitPriceAmount(), i.getOrder().getCurrency()), i.getQuantity(),
                                    Money.of(i.getLineTotal(), i.getOrder().getCurrency())))
                            .toList(),
                    o.getCreatedAt());
        }
    }

    static BusinessRuleException invalidTransition(OrderStatus from, OrderStatus to) {
        return new BusinessRuleException("INVALID_STATUS_CHANGE", "A " + from + " order cannot become " + to + ".");
    }
}
