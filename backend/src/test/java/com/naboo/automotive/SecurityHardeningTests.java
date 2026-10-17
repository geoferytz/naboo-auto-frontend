package com.naboo.automotive;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.DocumentContext;
import com.naboo.automotive.users.Role;

/** Security tests from the roadmap's Phase-13 critical list: IDOR, price tampering, payment idempotency, injection. */
class SecurityHardeningTests extends GraphQlIntegrationTest {

    private String registerCustomer() {
        return assertNoErrors(gql("mutation($i: RegisterInput!) { register(input: $i) { token } }",
                Map.of("i", Map.of("email", "sec-" + UUID.randomUUID() + "@example.test",
                        "password", "a-very-long-password", "fullName", "Sec"))))
                .read("$.data.register.token");
    }

    @Test
    void pricesCannotBeInjectedThroughOrderInput() {
        String staff = tokenFor(Role.INVENTORY_MANAGER);
        String customer = registerCustomer();
        String accessoryId = assertNoErrors(gql(staff, """
                mutation($i: AccessoryInput!) { createAccessory(input: $i) { id } }""",
                Map.of("i", Map.of("name", "Tamper test", "priceAmount", "45000", "stockQuantity", 10,
                        "active", true, "category", "Parts")))).read("$.data.createAccessory.id");

        // A client-supplied price field fails schema validation outright.
        String malicious = """
                mutation { placeOrder(input: {fullName: "T", email: "t@example.test", phone: "+255700000099",
                  items: [{accessoryId: "%s", quantity: 1, price: "0.01"}]}) { reference } }"""
                .formatted(accessoryId);
        DocumentContext rejected = gql(customer, malicious, null);
        assertThat(rejected.jsonString()).contains("errors");

        // The legitimate order uses the server-side catalogue price.
        Map<String, Object> oi = Map.of("fullName", "T", "email", "t2@example.test", "phone", "+255700000099",
                "items", List.of(Map.of("accessoryId", accessoryId, "quantity", 2)));
        assertNoErrors(gql(customer, "mutation($i: OrderInput!) { placeOrder(input: $i) { reference } }",
                Map.of("i", oi)));
        DocumentContext mine = assertNoErrors(gql(customer, "{ myOrders { items { id total { amount } } } }", null));
        assertThat(mine.read("$.data.myOrders.items[0].total.amount", String.class)).isEqualTo("90000.00");

        // Another customer cannot touch that order (IDOR).
        String stranger = registerCustomer();
        String orderId = mine.read("$.data.myOrders.items[0].id");
        assertThat(errorCode(gql(stranger, "mutation($id: ID!) { cancelMyOrder(id: $id) { id } }",
                Map.of("id", orderId)))).isEqualTo("NOT_FOUND");
    }

    @Test
    void paymentRecordingIsIdempotentAndFinanceOnly() {
        String finance = tokenFor(Role.FINANCE_OFFICER);
        String mechanic = tokenFor(Role.MECHANIC);

        String invoiceId = assertNoErrors(gql(finance, """
                mutation($i: InvoiceInput!) { createInvoice(input: $i) { id } }""",
                Map.of("i", Map.of("recipientName", "Pay Idem", "recipientEmail", "pi@example.test",
                        "items", List.of(Map.of("description", "Work", "quantity", 1, "unitPrice", "50000"))))))
                .read("$.data.createInvoice.id");
        assertNoErrors(gql(finance, "mutation($id: ID!) { issueInvoice(id: $id) { id } }", Map.of("id", invoiceId)));

        // A mechanic (workshop staff) must not record payments.
        assertThat(errorClassification(gql(mechanic, """
                mutation($id: ID!) { recordPayment(invoiceId: $id, input: {amount: "1000", method: CASH}) { id } }""",
                Map.of("id", invoiceId)))).isEqualTo("FORBIDDEN");

        // Repeated submission of the same payment (same requestToken) records only once.
        String token = UUID.randomUUID().toString();
        String payMutation = """
                mutation($id: ID!, $p: PaymentInput!) {
                  recordPayment(invoiceId: $id, input: $p) { id payments { amount { amount } } }
                }""";
        Map<String, Object> vars = Map.of("id", invoiceId,
                "p", Map.of("amount", "20000", "method", "MPESA", "reference", "PAY123", "requestToken", token));
        assertNoErrors(gql(finance, payMutation, vars));
        DocumentContext again = assertNoErrors(gql(finance, payMutation, vars));
        List<Map<String, Object>> payments = again.read("$.data.recordPayment.payments");
        assertThat(payments).hasSize(1);

        // The invoice cannot accept a second full payment once PAID.
        assertNoErrors(gql(finance, payMutation,
                Map.of("id", invoiceId, "p", Map.of("amount", "30000", "method", "CASH"))));
        assertThat(errorCode(gql(finance, payMutation,
                Map.of("id", invoiceId, "p", Map.of("amount", "1", "method", "CASH"))))).isEqualTo("NOT_PAYABLE");
    }

    @Test
    void injectionStringsInPublicQueriesAreHandledSafely() {
        // SQL-injection-shaped input in the public search must be treated as a plain string, not error or leak data.
        DocumentContext result = assertNoErrors(gql("""
                { vehicles(filter: {search: "x' OR '1'='1' --"}, size: 5) { totalCount items { id } } }""", null));
        assertThat(result.read("$.data.vehicles.items", List.class)).isNotNull();
        // Login with an injection email simply fails authentication.
        assertThat(errorCode(gql("""
                mutation { login(input: {email: "' OR '1'='1", password: "x-password"}) { token } }""", null)))
                .isEqualTo("INVALID_CREDENTIALS");
    }
}
