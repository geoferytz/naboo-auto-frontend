package com.naboo.automotive.inventory;

import java.util.List;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.inventory.InventoryTypes.AccessoryInput;
import com.naboo.automotive.inventory.InventoryTypes.AccessoryView;
import com.naboo.automotive.inventory.InventoryTypes.OrderInput;
import com.naboo.automotive.inventory.InventoryTypes.OrderStatus;
import com.naboo.automotive.inventory.InventoryTypes.OrderView;
import com.naboo.automotive.inventory.InventoryTypes.StockAdjustInput;
import com.naboo.automotive.inventory.InventoryTypes.StockMovementView;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;

import jakarta.validation.Valid;

@Controller
@Validated
public class InventoryController {

    private final InventoryService inventory;

    public InventoryController(InventoryService inventory) {
        this.inventory = inventory;
    }

    // ------------------------------------------------------------------ public

    @QueryMapping
    public PageView<AccessoryView> accessories(@Argument String category, @Argument Integer page, @Argument Integer size) {
        return inventory.listPublic(category, page, size);
    }

    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public EnquiryReceipt placeOrder(@Argument @Valid OrderInput input, @AuthenticationPrincipal Jwt jwt) {
        return inventory.placeOrder(input, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ customer

    @QueryMapping
    @PreAuthorize("isAuthenticated()")
    public PageView<OrderView> myOrders(@AuthenticationPrincipal Jwt jwt, @Argument Integer page, @Argument Integer size) {
        return inventory.myOrders(CurrentUser.id(jwt), page, size);
    }

    @MutationMapping
    @PreAuthorize("isAuthenticated()")
    public OrderView cancelMyOrder(@Argument UUID id, @AuthenticationPrincipal Jwt jwt) {
        return inventory.cancelMine(id, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ staff: catalogue

    @QueryMapping
    @PreAuthorize(Permissions.INVENTORY_MANAGE)
    public PageView<AccessoryView> adminAccessories(@Argument String search, @Argument Boolean active,
            @Argument Integer page, @Argument Integer size) {
        return inventory.listAdmin(search, active, page, size);
    }

    @QueryMapping
    @PreAuthorize(Permissions.INVENTORY_MANAGE)
    public List<StockMovementView> stockMovements(@Argument UUID accessoryId) {
        return inventory.movements(accessoryId);
    }

    @MutationMapping
    @PreAuthorize(Permissions.INVENTORY_MANAGE)
    public AccessoryView createAccessory(@Argument @Valid AccessoryInput input, @AuthenticationPrincipal Jwt jwt) {
        return inventory.createAccessory(input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.INVENTORY_MANAGE)
    public AccessoryView updateAccessory(@Argument UUID id, @Argument @Valid AccessoryInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return inventory.updateAccessory(id, input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.INVENTORY_MANAGE)
    public AccessoryView adjustStock(@Argument UUID id, @Argument @Valid StockAdjustInput input,
            @AuthenticationPrincipal Jwt jwt) {
        return inventory.adjustStock(id, input, CurrentUser.id(jwt));
    }

    // ------------------------------------------------------------------ staff: orders

    @QueryMapping
    @PreAuthorize(Permissions.ORDER_MANAGE)
    public PageView<OrderView> orders(@Argument OrderStatus status, @Argument Integer page, @Argument Integer size) {
        return inventory.listOrders(status, page, size);
    }

    @MutationMapping
    @PreAuthorize(Permissions.ORDER_MANAGE)
    public OrderView updateOrder(@Argument UUID id, @Argument OrderStatus status, @AuthenticationPrincipal Jwt jwt) {
        return inventory.updateOrder(id, status, CurrentUser.id(jwt));
    }
}
