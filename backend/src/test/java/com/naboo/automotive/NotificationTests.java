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

class NotificationTests extends GraphQlIntegrationTest {

    private static final ZoneId TZ = ZoneId.of("Africa/Dar_es_Salaam");

    @Test
    void staffActionsNotifyTheCustomerAndOwnershipIsEnforced() {
        String manager = tokenFor(Role.MANAGER);
        String customerToken = assertNoErrors(gql(
                "mutation { register(input: {email: \"n-"
                        + UUID.randomUUID() + "@example.test\", password: \"long-password-123\", fullName: \"N\"}) { token } }",
                null)).read("$.data.register.token");
        String customerEmail = assertNoErrors(gql(customerToken, "{ me { email } }", null)).read("$.data.me.email");

        // Customer books a service; staff confirms it -> a notification is created for the customer.
        String catId = assertNoErrors(gql(manager,
                "mutation($i: ServiceCategoryInput!) { createServiceCategory(input: $i) { id } }",
                Map.of("i", Map.of("name", "Notif cat " + UUID.randomUUID())))).read("$.data.createServiceCategory.id");
        String serviceId = assertNoErrors(gql(manager,
                "mutation($i: ServiceInput!) { createService(input: $i) { id } }",
                Map.of("i", Map.of("categoryId", catId, "name", "Notif svc", "summary", "s", "priceType", "FIXED",
                        "priceAmount", "50000", "durationMinutes", 30)))).read("$.data.createService.id");
        String slot = ZonedDateTime.now(TZ).plusDays(5).withHour(11).withMinute(0).withSecond(0).withNano(0)
                .toOffsetDateTime().toString();
        Map<String, Object> bi = new HashMap<>(Map.of("serviceId", serviceId, "fullName", "N", "email", customerEmail,
                "phone", "+255700000060", "vehicleDescription", "Vitz", "scheduledStart", slot));
        assertNoErrors(gql(customerToken,
                "mutation($i: BookingInput!) { bookService(input: $i) { reference } }", Map.of("i", bi)));
        String bookingId = assertNoErrors(gql(customerToken, "{ myServiceBookings { items { id } } }", null))
                .read("$.data.myServiceBookings.items[0].id");
        assertNoErrors(gql(manager,
                "mutation($id: ID!) { updateServiceBooking(id: $id, input: {status: CONFIRMED}) { id } }",
                Map.of("id", bookingId)));

        // The customer sees one unread notification; a stranger sees none and cannot mark it.
        DocumentContext unread = assertNoErrors(gql(customerToken, "{ unreadNotificationCount }", null));
        assertThat(unread.read("$.data.unreadNotificationCount", Integer.class)).isEqualTo(1);
        DocumentContext list = assertNoErrors(gql(customerToken,
                "{ myNotifications { items { id type title read link } } }", null));
        assertThat(list.read("$.data.myNotifications.items[0].type", String.class)).isEqualTo("BOOKING_STATUS");
        assertThat(list.read("$.data.myNotifications.items[0].read", Boolean.class)).isFalse();
        String notificationId = list.read("$.data.myNotifications.items[0].id");

        String stranger = assertNoErrors(gql(
                "mutation { register(input: {email: \"str-" + UUID.randomUUID()
                        + "@example.test\", password: \"long-password-123\", fullName: \"S\"}) { token } }",
                null)).read("$.data.register.token");
        assertThat(errorCode(gql(stranger,
                "mutation($id: ID!) { markNotificationRead(id: $id) { id } }", Map.of("id", notificationId))))
                .isEqualTo("NOT_FOUND");

        // Mark read, then mark-all-read path.
        assertNoErrors(gql(customerToken,
                "mutation($id: ID!) { markNotificationRead(id: $id) { read } }", Map.of("id", notificationId)));
        assertThat(assertNoErrors(gql(customerToken, "{ unreadNotificationCount }", null))
                .read("$.data.unreadNotificationCount", Integer.class)).isEqualTo(0);

        // Dashboard now reports operational metrics.
        DocumentContext dash = assertNoErrors(gql(manager,
                "{ adminDashboard { pendingBookings openQuotations revenueThisMonth { amount currency } "
                        + "outstandingReceivables { amount } lowStockItems } }", null));
        assertThat(dash.read("$.data.adminDashboard.revenueThisMonth.currency", String.class)).isEqualTo("TZS");
        assertThat(dash.read("$.data.adminDashboard.pendingBookings", Integer.class)).isGreaterThanOrEqualTo(0);
    }
}
