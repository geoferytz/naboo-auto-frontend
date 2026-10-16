package com.naboo.automotive;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.DocumentContext;
import com.naboo.automotive.users.Role;

class WorkshopInventoryBillingTests extends GraphQlIntegrationTest {

    private static final ZoneId TZ = ZoneId.of("Africa/Dar_es_Salaam");

    private String registerCustomer() {
        String email = "cust-" + UUID.randomUUID() + "@example.test";
        return assertNoErrors(gql("mutation($i: RegisterInput!) { register(input: $i) { token } }",
                Map.of("i", Map.of("email", email, "password", "a-very-long-password", "fullName", "Cust"))))
                .read("$.data.register.token");
    }

    private String createService(String manager) {
        String catId = assertNoErrors(gql(manager,
                "mutation($i: ServiceCategoryInput!) { createServiceCategory(input: $i) { id } }",
                Map.of("i", Map.of("name", "Job cat " + UUID.randomUUID())))).read("$.data.createServiceCategory.id");
        return assertNoErrors(gql(manager,
                "mutation($i: ServiceInput!) { createService(input: $i) { id } }",
                Map.of("i", Map.of("categoryId", catId, "name", "Brake service", "summary", "s", "priceType", "FIXED",
                        "priceAmount", "80000", "durationMinutes", 60)))).read("$.data.createService.id");
    }

    @Test
    void workshopJobLifecycleFromBooking() {
        String manager = tokenFor(Role.MANAGER);
        String mechanic = tokenFor(Role.MECHANIC);
        String serviceId = createService(manager);

        // Make a booking, then raise a job card from it. Unique slot: capacity may be 1 from another test class.
        String slot = ZonedDateTime.now(TZ).plusDays(3).withHour(13).withMinute(0).withSecond(0).withNano(0)
                .toOffsetDateTime().toString();
        Map<String, Object> bi = new HashMap<>(Map.of("serviceId", serviceId, "fullName", "B", "email",
                "b-" + UUID.randomUUID() + "@example.test", "phone", "+255700000020",
                "vehicleDescription", "2019 Hilux", "scheduledStart", slot));
        assertNoErrors(gql("mutation($i: BookingInput!) { bookService(input: $i) { reference } }", Map.of("i", bi)));
        String bookingId = assertNoErrors(gql(manager, "{ serviceBookings(status: PENDING) { items { id } } }", null))
                .read("$.data.serviceBookings.items[0].id");

        Map<String, Object> ji = Map.of("bookingId", bookingId, "vehicleDescription", "2019 Hilux",
                "description", "Replace front brake pads and skim discs");
        String jobId = assertNoErrors(gql(mechanic,
                "mutation($i: CreateJobInput!) { createWorkshopJob(input: $i) { id reference status } }",
                Map.of("i", ji))).read("$.data.createWorkshopJob.id");

        // SCHEDULED -> IN_PROGRESS -> ON_HOLD -> IN_PROGRESS -> COMPLETED; no edits afterwards.
        assertNoErrors(gql(mechanic, "mutation($id: ID!) { setWorkshopJobStatus(id: $id, status: IN_PROGRESS) { id } }",
                Map.of("id", jobId)));
        assertNoErrors(gql(mechanic, "mutation($id: ID!) { setWorkshopJobStatus(id: $id, status: ON_HOLD) { id } }",
                Map.of("id", jobId)));
        assertThat(errorCode(gql(mechanic, "mutation($id: ID!) { setWorkshopJobStatus(id: $id, status: SCHEDULED) { id } }",
                Map.of("id", jobId)))).isEqualTo("INVALID_STATUS_CHANGE");
        assertNoErrors(gql(mechanic, "mutation($id: ID!) { setWorkshopJobStatus(id: $id, status: IN_PROGRESS) { id } }",
                Map.of("id", jobId)));
        assertNoErrors(gql(mechanic, "mutation($id: ID!) { setWorkshopJobStatus(id: $id, status: COMPLETED) { id } }",
                Map.of("id", jobId)));
        assertThat(errorCode(gql(mechanic,
                "mutation($id: ID!) { updateWorkshopJob(id: $id, input: {laborNotes: \"x\"}) { id } }", Map.of("id", jobId))))
                .isEqualTo("JOB_CLOSED");

        // Customers cannot touch the workshop API.
        assertThat(errorClassification(gql(registerCustomer(), "{ workshopJobs { totalCount } }", null)))
                .isEqualTo("FORBIDDEN");
    }

    private String createAccessory(String staff, String name, int stock) {
        return assertNoErrors(gql(staff, """
                mutation($i: AccessoryInput!) { createAccessory(input: $i) { id sku stockQuantity } }""",
                Map.of("i", Map.of("name", name, "priceAmount", "45000", "stockQuantity", stock, "active", true,
                        "category", "Parts")))).read("$.data.createAccessory.id");
    }

    @Test
    void orderDecrementsStockAndCancelRestocks() {
        String inventoryManager = tokenFor(Role.INVENTORY_MANAGER);
        String customer = registerCustomer();
        String accessoryId = createAccessory(inventoryManager, "Brake pad set", 3);

        // Public catalogue shows it.
        DocumentContext pub = assertNoErrors(gql("{ accessories { items { id name stockQuantity inStock } } }", null));
        assertThat(pub.read("$.data.accessories.items[0].name", String.class)).isEqualTo("Brake pad set");

        // Overselling is rejected.
        Map<String, Object> tooMany = new HashMap<>(Map.of("fullName", "Buyer", "email",
                "buy-" + UUID.randomUUID() + "@example.test", "phone", "+255700000030",
                "items", List.of(Map.of("accessoryId", accessoryId, "quantity", 5))));
        assertThat(errorCode(gql(customer, "mutation($i: OrderInput!) { placeOrder(input: $i) { reference } }",
                Map.of("i", tooMany)))).isEqualTo("INSUFFICIENT_STOCK");

        // A valid order + idempotent retry.
        String reqToken = UUID.randomUUID().toString();
        Map<String, Object> oi = new HashMap<>(Map.of("fullName", "Buyer", "email",
                "buy2-" + UUID.randomUUID() + "@example.test", "phone", "+255700000031",
                "items", List.of(Map.of("accessoryId", accessoryId, "quantity", 2))));
        oi.put("requestToken", reqToken);
        String ref = assertNoErrors(gql(customer, "mutation($i: OrderInput!) { placeOrder(input: $i) { reference } }",
                Map.of("i", oi))).read("$.data.placeOrder.reference");
        assertThat(ref).startsWith("NA-ORD-");
        assertThat(assertNoErrors(gql(customer,
                "mutation($i: OrderInput!) { placeOrder(input: $i) { reference } }", Map.of("i", oi)))
                .read("$.data.placeOrder.reference", String.class)).isEqualTo(ref);

        // Stock went 3 -> 1.
        DocumentContext after = assertNoErrors(gql("{ accessories { items { stockQuantity } } }", null));
        assertThat(after.read("$.data.accessories.items[0].stockQuantity", Integer.class)).isEqualTo(1);

        // Customer cancels while PENDING -> stock restored and movement recorded.
        String orderId = assertNoErrors(gql(customer, "{ myOrders { items { id status total { amount } } } }", null))
                .read("$.data.myOrders.items[0].id");
        assertNoErrors(gql(customer, "mutation($id: ID!) { cancelMyOrder(id: $id) { status } }", Map.of("id", orderId)));
        assertThat(assertNoErrors(gql("{ accessories { items { stockQuantity } } }", null))
                .read("$.data.accessories.items[0].stockQuantity", Integer.class)).isEqualTo(3);
        List<Map<String, Object>> moves = assertNoErrors(gql(inventoryManager,
                "query($id: ID!) { stockMovements(accessoryId: $id) { delta reason } }", Map.of("id", accessoryId)))
                .read("$.data.stockMovements");
        assertThat(moves.stream().map(m -> m.get("reason"))).contains("ORDER_PLACED", "ORDER_CANCELLED");
    }

    @Test
    void staffOrderTransitionsAndRestockRules() {
        String inventoryManager = tokenFor(Role.INVENTORY_MANAGER);
        String customer = registerCustomer();
        String accessoryId = createAccessory(inventoryManager, "Oil filter", 10);

        Map<String, Object> oi = Map.of("fullName", "Buyer", "email", "buy-" + UUID.randomUUID() + "@example.test",
                "phone", "+255700000032",
                "items", List.of(Map.of("accessoryId", accessoryId, "quantity", 4)));
        assertNoErrors(gql(customer, "mutation($i: OrderInput!) { placeOrder(input: $i) { reference } }",
                Map.of("i", oi)));

        String orderId = assertNoErrors(gql(inventoryManager, "{ orders(status: PENDING) { items { id } } }", null))
                .read("$.data.orders.items[0].id");
        assertNoErrors(gql(inventoryManager,
                "mutation($id: ID!) { updateOrder(id: $id, status: CONFIRMED) { status } }", Map.of("id", orderId)));
        assertNoErrors(gql(inventoryManager,
                "mutation($id: ID!) { updateOrder(id: $id, status: READY) { status } }", Map.of("id", orderId)));
        assertThat(errorCode(gql(inventoryManager,
                "mutation($id: ID!) { updateOrder(id: $id, status: PENDING) { id } }", Map.of("id", orderId))))
                .isEqualTo("INVALID_STATUS_CHANGE");

        // Staff cancellation restocks.
        assertNoErrors(gql(inventoryManager,
                "mutation($id: ID!) { updateOrder(id: $id, status: CANCELLED) { status } }", Map.of("id", orderId)));
        assertThat(assertNoErrors(gql("{ accessories { items { stockQuantity } } }", null))
                .read("$.data.accessories.items[0].stockQuantity", Integer.class)).isEqualTo(10);
    }

    @Test
    void invoiceLifecycleAndPartialPayments() {
        String finance = tokenFor(Role.FINANCE_OFFICER);
        String customer = registerCustomer();

        // Create a draft invoice with two lines, then amend it.
        Map<String, Object> input = new HashMap<>(Map.of(
                "recipientName", "Invoice Me", "recipientEmail", "inv-" + UUID.randomUUID() + "@example.test",
                "items", List.of(
                        Map.of("description", "Brake pads (front)", "quantity", 1, "unitPrice", "85000"),
                        Map.of("description", "Labour", "quantity", 2, "unitPrice", "30000"))));
        String invoiceId = assertNoErrors(gql(finance,
                "mutation($i: InvoiceInput!) { createInvoice(input: $i) { id status total { amount } } }",
                Map.of("i", input))).read("$.data.createInvoice.id");
        assertNoErrors(gql(finance, """
                mutation($id: ID!) { addInvoiceItem(invoiceId: $id, input: {description: "Consumables", quantity: 1, unitPrice: "5000"}) { id } }""",
                Map.of("id", invoiceId)));

        // Payments cannot be recorded on a draft; issue first.
        assertThat(errorCode(gql(finance, """
                mutation($id: ID!) { recordPayment(invoiceId: $id, input: {amount: "100", method: CASH}) { id } }""",
                Map.of("id", invoiceId)))).isEqualTo("NOT_PAYABLE");
        assertNoErrors(gql(finance, "mutation($id: ID!) { issueInvoice(id: $id) { status total { amount } } }",
                Map.of("id", invoiceId)));

        // Partial payment, overpayment guard, then completion -> PAID.
        assertNoErrors(gql(finance, """
                mutation($id: ID!) { recordPayment(invoiceId: $id, input: {amount: "100000", method: MPESA, reference: "SMK123"}) { paid { amount } balance { amount } } }""",
                Map.of("id", invoiceId)));
        assertThat(errorCode(gql(finance, """
                mutation($id: ID!) { recordPayment(invoiceId: $id, input: {amount: "999999", method: CASH}) { id } }""",
                Map.of("id", invoiceId)))).isEqualTo("OVERPAYMENT");
        DocumentContext paid = assertNoErrors(gql(finance, """
                mutation($id: ID!) { recordPayment(invoiceId: $id, input: {amount: "50000", method: TIGOPESA}) { status balance { amount } } }""",
                Map.of("id", invoiceId)));
        assertThat(paid.read("$.data.recordPayment.status", String.class)).isEqualTo("PAID");
        assertThat(paid.read("$.data.recordPayment.balance.amount", String.class)).isEqualTo("0.00");

        // A paid invoice cannot be voided, and customers can't reach the staff query.
        assertThat(errorCode(gql(finance, "mutation($id: ID!) { voidInvoice(id: $id) { id } }", Map.of("id", invoiceId))))
                .isEqualTo("ALREADY_PAID");
        assertThat(errorClassification(gql(customer, "{ invoices { totalCount } }", null))).isEqualTo("FORBIDDEN");
    }
}
