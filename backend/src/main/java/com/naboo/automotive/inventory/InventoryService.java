package com.naboo.automotive.inventory;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthService;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.Identifiers;
import com.naboo.automotive.common.Money;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.config.AppProperties;
import com.naboo.automotive.customers.Customer;
import com.naboo.automotive.customers.CustomerRepository;
import com.naboo.automotive.inventory.InventoryTypes.AccessoryInput;
import com.naboo.automotive.inventory.InventoryTypes.AccessoryView;
import com.naboo.automotive.inventory.InventoryTypes.OrderInput;
import com.naboo.automotive.inventory.InventoryTypes.OrderItemInput;
import com.naboo.automotive.inventory.InventoryTypes.OrderStatus;
import com.naboo.automotive.inventory.InventoryTypes.OrderView;
import com.naboo.automotive.inventory.InventoryTypes.StockAdjustInput;
import com.naboo.automotive.inventory.InventoryTypes.StockMovementView;
import com.naboo.automotive.inventory.InventoryTypes.StockReason;
import com.naboo.automotive.notifications.Notification.NotificationType;
import com.naboo.automotive.notifications.NotificationService;
import com.naboo.automotive.vehicles.VehicleViews.EnquiryReceipt;

import jakarta.persistence.criteria.Predicate;

@Service
public class InventoryService {

    private final AccessoryRepository accessories;
    private final StockMovementRepository movements;
    private final OrderRepository orders;
    private final CustomerRepository customers;
    private final AuditService audit;
    private final NotificationService notifications;
    private final AppProperties properties;

    public InventoryService(AccessoryRepository accessories, StockMovementRepository movements,
            OrderRepository orders, CustomerRepository customers, AuditService audit, NotificationService notifications,
            AppProperties properties) {
        this.accessories = accessories;
        this.movements = movements;
        this.orders = orders;
        this.customers = customers;
        this.audit = audit;
        this.notifications = notifications;
        this.properties = properties;
    }

    // ------------------------------------------------------------------ public catalogue

    @Transactional(readOnly = true)
    public PageView<AccessoryView> listPublic(String category, Integer page, Integer size) {
        Specification<Accessory> spec = (root, q, cb) -> {
            var active = cb.isTrue(root.get("active"));
            return category == null || category.isBlank() ? active
                    : cb.and(active, cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase()));
        };
        return PageView.of(
                accessories.findAll(spec, PageView.request(page, size, Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id")))),
                AccessoryView::of);
    }

    // ------------------------------------------------------------------ staff: catalogue & stock

    @Transactional(readOnly = true)
    public PageView<AccessoryView> listAdmin(String search, Boolean active, Integer page, Integer size) {
        Specification<Accessory> spec = (root, q, cb) -> {
            List<Predicate> p = new java.util.ArrayList<>();
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("sku")), like)));
            }
            if (active != null) {
                p.add(cb.equal(root.get("active"), active));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return PageView.of(
                accessories.findAll(spec, PageView.request(page, size, Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id")))),
                AccessoryView::of);
    }

    @Transactional(readOnly = true)
    public List<StockMovementView> movements(UUID accessoryId) {
        load(accessoryId);
        return movements.findByAccessoryIdOrderByCreatedAtDesc(accessoryId, PageRequest.of(0, 50)).stream()
                .map(m -> new StockMovementView(m.getId(), m.getDelta(), m.getReason(), m.getOrderId(),
                        m.getActorUserId(), m.getNote(), m.getCreatedAt()))
                .toList();
    }

    @Transactional
    public AccessoryView createAccessory(AccessoryInput input, UUID actor) {
        String sku = input.sku() == null || input.sku().isBlank()
                ? "ACC-" + Identifiers.randomToken(6)
                : input.sku().trim().toUpperCase();
        if (accessories.existsBySku(sku)) {
            throw new BusinessRuleException("SKU_TAKEN", "SKU '" + sku + "' is already in use.");
        }
        Accessory a = new Accessory(sku, properties.currency());
        a.apply(input, Money.parseAmount(input.priceAmount(), "priceAmount"));
        a.setStockQuantity(input.stockQuantity());
        accessories.saveAndFlush(a);
        audit.record(actor, "ACCESSORY_CREATED", "Accessory", a.getId(), sku);
        return AccessoryView.of(a);
    }

    @Transactional
    public AccessoryView updateAccessory(UUID id, AccessoryInput input, UUID actor) {
        Accessory a = load(id);
        if (input.sku() != null && !input.sku().isBlank() && !input.sku().trim().equalsIgnoreCase(a.getSku())
                && accessories.existsBySku(input.sku().trim().toUpperCase())) {
            throw new BusinessRuleException("SKU_TAKEN", "SKU '" + input.sku().trim() + "' is already in use.");
        }
        a.apply(input, Money.parseAmount(input.priceAmount(), "priceAmount"));
        audit.record(actor, "ACCESSORY_UPDATED", "Accessory", id, a.getSku());
        accessories.flush();
        return AccessoryView.of(a);
    }

    @Transactional
    public AccessoryView adjustStock(UUID id, StockAdjustInput input, UUID actor) {
        Accessory a = load(id);
        a.moveStock(input.delta());
        movements.save(new StockMovement(a, input.delta(), input.reason(), null, actor,
                input.note() == null || input.note().isBlank() ? null : input.note().trim()));
        audit.record(actor, "STOCK_ADJUSTED", "Accessory", id, input.delta() + " (" + input.reason() + ")");
        accessories.flush();
        return AccessoryView.of(a);
    }

    // ------------------------------------------------------------------ orders

    @Transactional
    public EnquiryReceipt placeOrder(OrderInput input, UUID userId) {
        if (input.requestToken() != null) {
            var existing = orders.findByRequestToken(input.requestToken());
            if (existing.isPresent()) {
                return new EnquiryReceipt(existing.get().getReference(),
                        "This order was already submitted. Your order reference is unchanged.");
            }
        }

        // Aggregate quantities per accessory, then lock all affected rows in a consistent order.
        Map<UUID, Integer> qty = input.items().stream()
                .collect(Collectors.toMap(OrderItemInput::accessoryId, OrderItemInput::quantity, Integer::sum));
        List<Accessory> locked = accessories.findAllForUpdate(List.copyOf(new HashSet<>(qty.keySet())));
        Map<UUID, Accessory> byId = locked.stream().collect(Collectors.toMap(Accessory::getId, Function.identity()));
        if (byId.size() != qty.size()) {
            throw new NotFoundException("One or more items could not be found.");
        }

        String currency = properties.currency();
        BigDecimal total = BigDecimal.ZERO;
        for (var entry : qty.entrySet()) {
            Accessory a = byId.get(entry.getKey());
            if (!a.isActive()) {
                throw new BusinessRuleException("ITEM_UNAVAILABLE", "'" + a.getName() + "' is no longer on sale.");
            }
            a.moveStock(-entry.getValue());
            total = total.add(a.getPriceAmount().multiply(BigDecimal.valueOf(entry.getValue())));
        }

        UUID customerId = userId == null ? null : customers.findByUserId(userId).map(Customer::getId).orElse(null);
        Order order = new Order(Identifiers.reference("ORD"), input.requestToken(), customerId, input.fullName().trim(),
                AuthService.normaliseEmail(input.email()), input.phone().trim(), total, currency,
                blankToNull(input.notes()));
        for (var entry : qty.entrySet()) {
            order.addItem(new OrderItem(order, byId.get(entry.getKey()), entry.getValue()));
        }
        orders.save(order); // persist first so the generated id is available for the movement log
        for (var entry : qty.entrySet()) {
            movements.save(new StockMovement(byId.get(entry.getKey()), -entry.getValue(), StockReason.ORDER_PLACED,
                    order.getId(), userId, order.getReference()));
        }
        try {
            orders.flush();
        } catch (DataIntegrityViolationException e) {
            if (input.requestToken() != null) {
                var existing = orders.findByRequestToken(input.requestToken());
                if (existing.isPresent()) {
                    return new EnquiryReceipt(existing.get().getReference(),
                            "This order was already submitted. Your order reference is unchanged.");
                }
            }
            throw e;
        }
        audit.record(userId, "ORDER_PLACED", "Order", order.getId(), order.getReference() + " " + total);
        return new EnquiryReceipt(order.getReference(),
                "Order received. We will confirm availability and arrange collection or delivery.");
    }

    @Transactional(readOnly = true)
    public PageView<OrderView> myOrders(UUID userId, Integer page, Integer size) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId).orElse(null);
        if (customerId == null) {
            return PageView.empty();
        }
        return PageView.of(orders.findByCustomerIdOrderByCreatedAtDesc(customerId,
                PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt")))), OrderView::of);
    }

    @Transactional
    public OrderView cancelMine(UUID id, UUID userId) {
        UUID customerId = customers.findByUserId(userId).map(Customer::getId)
                .orElseThrow(() -> new NotFoundException("Customer profile not found."));
        Order order = orders.findById(id).orElseThrow(() -> new NotFoundException("Order not found."));
        if (!customerId.equals(order.getCustomerId())) {
            throw new NotFoundException("Order not found.");
        }
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BusinessRuleException("CANNOT_CANCEL", "This order can no longer be cancelled online.");
        }
        order.transition(OrderStatus.CANCELLED);
        restock(order, userId);
        audit.record(userId, "ORDER_CANCELLED", "Order", id, order.getReference());
        orders.flush();
        return OrderView.of(order);
    }

    // ------------------------------------------------------------------ staff: orders

    @Transactional(readOnly = true)
    public PageView<OrderView> listOrders(OrderStatus status, Integer page, Integer size) {
        var request = PageView.request(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")));
        var result = status == null ? orders.findAll(request) : orders.findByStatus(status, request);
        return PageView.of(result, OrderView::of);
    }

    @Transactional
    public OrderView updateOrder(UUID id, OrderStatus status, UUID actor) {
        Order order = orders.findById(id).orElseThrow(() -> new NotFoundException("Order not found."));
        OrderStatus previous = order.getStatus();
        order.transition(status);
        if (status == OrderStatus.CANCELLED) {
            restock(order, actor);
        }
        orders.flush();
        if (previous != status) {
            audit.record(actor, "ORDER_STATUS_CHANGED", "Order", id, previous + " -> " + status);
            notifications.notifyCustomer(order.getCustomerId(), NotificationType.ORDER_STATUS,
                    "Order " + order.getReference() + " " + status.name().replace('_', ' ').toLowerCase(),
                    orderBody(status), "/my-account", "Order", id);
        }
        return OrderView.of(order);
    }

    private static String orderBody(OrderStatus status) {
        return switch (status) {
            case CONFIRMED -> "Your order is confirmed and being prepared.";
            case READY -> "Your order is ready for collection.";
            case COMPLETED -> "Your order is complete. Thank you!";
            case CANCELLED -> "Your order was cancelled and the items have been returned to stock.";
            case PENDING -> "Your order is pending.";
        };
    }

    private void restock(Order order, UUID actor) {
        for (OrderItem item : order.getItems()) {
            Accessory a = accessories.findAllForUpdate(List.of(item.getAccessory().getId())).get(0);
            a.moveStock(item.getQuantity());
            movements.save(new StockMovement(a, item.getQuantity(), StockReason.ORDER_CANCELLED, order.getId(), actor,
                    order.getReference()));
        }
    }

    private Accessory load(UUID id) {
        return accessories.findById(id).orElseThrow(() -> new NotFoundException("Accessory not found."));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
