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

class RentalBookingQuotationTests extends GraphQlIntegrationTest {

    private static final ZoneId TZ = ZoneId.of("Africa/Dar_es_Salaam");

    @Test
    void publicRentalSearchFiltersDailyRatesAndHidesPrivateOptions() {
        String staff = tokenFor(Role.RENTAL_AGENT);
        String make = "Search" + UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> input = new HashMap<>(Map.of("make", make, "model", "Search SUV", "year", 2021,
                "fuelType", "PETROL", "transmission", "AUTOMATIC", "bodyType", "SUV", "dailyRateAmount", "150000.25"));
        String id = assertNoErrors(gql(staff,
                "mutation($i: RentalVehicleInput!) { createRentalVehicle(input: $i) { id } }",
                Map.of("i", input))).read("$.data.createRentalVehicle.id");
        String optionsQuery = "{ rentalSearchOptions { make model year } }";
        assertThat(assertNoErrors(gql(optionsQuery, null)).<List<String>>read("$.data.rentalSearchOptions[*].make")).doesNotContain(make);
        assertNoErrors(gql(staff, "mutation($id: ID!) { setRentalVehiclePublished(id: $id, published: true) { id } }", Map.of("id", id)));
        assertThat(assertNoErrors(gql(optionsQuery, null)).<List<String>>read("$.data.rentalSearchOptions[*].make")).contains(make);

        String query = "query($f: RentalFilter) { rentalVehicles(filter: $f, size: 1) { totalCount items { id dailyRate { amount } } } }";
        Map<String, Object> filter = new HashMap<>(Map.of("make", make.toLowerCase(), "model", "search suv",
                "minYear", 2021, "maxYear", 2021, "minPrice", "150000.25", "maxPrice", "150000.25"));
        DocumentContext match = assertNoErrors(gql(query, Map.of("f", filter)));
        assertThat(match.read("$.data.rentalVehicles.totalCount", Integer.class)).isEqualTo(1);
        assertThat(match.read("$.data.rentalVehicles.items[0].id", String.class)).isEqualTo(id);
        assertThat(match.read("$.data.rentalVehicles.items[0].dailyRate.amount", String.class)).isEqualTo("150000.25");
        for (Map.Entry<String, Object> mismatch : Map.<String, Object>of("model", "Other", "minYear", 2022,
                "maxPrice", "150000.24").entrySet()) {
            Map<String, Object> changed = new HashMap<>(filter);
            changed.put(mismatch.getKey(), mismatch.getValue());
            // Keep each range valid while proving the filter excludes the car.
            if (mismatch.getKey().equals("minYear")) changed.remove("maxYear");
            if (mismatch.getKey().equals("maxPrice")) changed.remove("minPrice");
            assertThat(assertNoErrors(gql(query, Map.of("f", changed)))
                    .read("$.data.rentalVehicles.totalCount", Integer.class)).isZero();
        }
        assertThat(errorCode(gql(query, Map.of("f", Map.of("minPrice", "-1"))))).isEqualTo("INVALID_AMOUNT");
        assertNoErrors(gql(staff, "mutation($id: ID!) { setRentalVehicleStatus(id: $id, status: UNAVAILABLE) { id } }", Map.of("id", id)));
        assertThat(assertNoErrors(gql(query, Map.of("f", filter))).read("$.data.rentalVehicles.totalCount", Integer.class)).isZero();
        assertThat(assertNoErrors(gql(optionsQuery, null)).<List<String>>read("$.data.rentalSearchOptions[*].make")).doesNotContain(make);
    }

    private String createRental(String token) {
        Map<String, Object> input = new HashMap<>(Map.of("make", "Toyota", "model", "RAV4", "year", 2021, "seats", 5,
                "fuelType", "PETROL", "transmission", "AUTOMATIC", "bodyType", "SUV", "dailyRateAmount", "150000",
                "depositAmount", "500000"));
        return assertNoErrors(gql(token,
                "mutation($i: RentalVehicleInput!) { createRentalVehicle(input: $i) { id slug } }",
                Map.of("i", input))).read("$.data.createRentalVehicle.id");
    }

    private Map<String, Object> reservationInput(UUID vehicleId, String token2, String start, String end) {
        Map<String, Object> m = new HashMap<>();
        m.put("rentalVehicleId", vehicleId.toString());
        m.put("fullName", "Test Renter");
        m.put("email", "renter-" + UUID.randomUUID() + "@example.test");
        m.put("phone", "+255700000001");
        m.put("startDate", start);
        m.put("endDate", end);
        if (token2 != null) {
            m.put("requestToken", token2);
        }
        return m;
    }

    private String futureDate(int plusDays) {
        return ZonedDateTime.now(TZ).plusDays(plusDays).toLocalDate().toString();
    }

    private String registerCustomer() {
        String email = "cust-" + UUID.randomUUID() + "@example.test";
        return assertNoErrors(gql("mutation($i: RegisterInput!) { register(input: $i) { token } }",
                Map.of("i", Map.of("email", email, "password", "a-very-long-password", "fullName", "Cust"))))
                .read("$.data.register.token");
    }

    @Test
    void rentalReservationIsIdempotentAndCannotOverlap() {
        String staff = tokenFor(Role.RENTAL_AGENT);
        String vehicleId = createRental(staff);
        assertNoErrors(gql(staff, "mutation($id: ID!) { setRentalVehiclePublished(id: $id, published: true) { id } }",
                Map.of("id", vehicleId)));

        // Public catalogue and availability quote (price computed server-side).
        DocumentContext pub = assertNoErrors(gql("{ rentalVehicles { totalCount } }", null));
        assertThat(pub.read("$.data.rentalVehicles.totalCount", Integer.class)).isGreaterThanOrEqualTo(1);
        DocumentContext avail = assertNoErrors(gql("""
                query($id: ID!, $s: Date!, $e: Date!) {
                  rentalAvailability(rentalVehicleId: $id, startDate: $s, endDate: $e) { available days total { amount } }
                }""", Map.of("id", vehicleId, "s", futureDate(10), "e", futureDate(15))));
        assertThat(avail.read("$.data.rentalAvailability.available", Boolean.class)).isTrue();
        assertThat(avail.read("$.data.rentalAvailability.days", Integer.class)).isEqualTo(5);
        assertThat(avail.read("$.data.rentalAvailability.total.amount", String.class)).isEqualTo("750000.00");

        // Reservation + idempotent retry with the same request token.
        String reqToken = UUID.randomUUID().toString();
        Map<String, Object> input = reservationInput(UUID.fromString(vehicleId), reqToken, futureDate(10), futureDate(15));
        String ref = assertNoErrors(gql("mutation($i: ReservationInput!) { requestRental(input: $i) { reference } }",
                Map.of("i", input))).read("$.data.requestRental.reference");
        String ref2 = assertNoErrors(gql("mutation($i: ReservationInput!) { requestRental(input: $i) { reference message } }",
                Map.of("i", input))).read("$.data.requestRental.reference");
        assertThat(ref2).isEqualTo(ref);

        // Overlapping and adjacent reservations.
        assertThat(errorCode(gql("mutation($i: ReservationInput!) { requestRental(input: $i) { reference } }",
                Map.of("i", reservationInput(UUID.fromString(vehicleId), null, futureDate(12), futureDate(20))))))
                .isEqualTo("DATES_UNAVAILABLE");
        assertNoErrors(gql("mutation($i: ReservationInput!) { requestRental(input: $i) { reference } }",
                Map.of("i", reservationInput(UUID.fromString(vehicleId), null, futureDate(15), futureDate(18)))));

        // Invalid dates are rejected: past start, and end before start.
        assertThat(errorCode(gql("mutation($i: ReservationInput!) { requestRental(input: $i) { reference } }",
                Map.of("i", reservationInput(UUID.fromString(vehicleId), null, futureDate(-1), futureDate(5))))))
                .isEqualTo("INVALID_DATES");
        assertThat(errorCode(gql("mutation($i: ReservationInput!) { requestRental(input: $i) { reference } }",
                Map.of("i", reservationInput(UUID.fromString(vehicleId), null, futureDate(40), futureDate(39))))))
                .isEqualTo("INVALID_DATES");

        // Staff workflow: PENDING -> CONFIRMED allowed, PENDING -> COMPLETED is not.
        DocumentContext list = assertNoErrors(gql(staff, "{ rentalReservations(status: PENDING) { items { id status } } }", null));
        String resId = list.read("$.data.rentalReservations.items[0].id");
        assertThat(errorCode(gql(staff,
                "mutation($id: ID!) { updateRentalReservation(id: $id, input: {status: COMPLETED}) { id } }",
                Map.of("id", resId)))).isEqualTo("INVALID_STATUS_CHANGE");
        assertNoErrors(gql(staff,
                "mutation($id: ID!) { updateRentalReservation(id: $id, input: {status: CONFIRMED}) { status } }",
                Map.of("id", resId)));

        // Customers cannot manage the fleet.
        assertThat(errorClassification(gql(tokenFor(Role.CUSTOMER),
                "mutation($i: RentalVehicleInput!) { createRentalVehicle(input: $i) { id } }",
                Map.of("i", Map.of("make", "X", "model", "Y", "year", 2020, "fuelType", "PETROL", "transmission", "MANUAL",
                        "bodyType", "SEDAN", "dailyRateAmount", "1000"))))).isEqualTo("FORBIDDEN");
    }

    @Test
    void customerCanListAndCancelOwnReservation() {
        String staff = tokenFor(Role.RENTAL_AGENT);
        String vehicleId = createRental(staff);
        assertNoErrors(gql(staff, "mutation($id: ID!) { setRentalVehiclePublished(id: $id, published: true) { id } }",
                Map.of("id", vehicleId)));

        String customer = registerCustomer();
        Map<String, Object> input = reservationInput(UUID.fromString(vehicleId), null, futureDate(30), futureDate(33));
        assertNoErrors(gql(customer, "mutation($i: ReservationInput!) { requestRental(input: $i) { reference } }",
                Map.of("i", input)));

        DocumentContext mine = assertNoErrors(gql(customer, "{ myRentalReservations { items { id status } } }", null));
        List<Map<String, String>> items = mine.read("$.data.myRentalReservations.items");
        assertThat(items).hasSize(1);
        String id = items.get(0).get("id");
        DocumentContext cancelled = assertNoErrors(gql(customer, "mutation($id: ID!) { cancelMyReservation(id: $id) { status } }",
                Map.of("id", id)));
        assertThat(cancelled.read("$.data.cancelMyReservation.status", String.class)).isEqualTo("CANCELLED");

        // Dates are free again once cancelled.
        assertNoErrors(gql("mutation($i: ReservationInput!) { requestRental(input: $i) { reference } }",
                Map.of("i", reservationInput(UUID.fromString(vehicleId), null, futureDate(30), futureDate(33)))));
    }

    private String createServiceWithDuration(String manager, int minutes) {
        String catId = assertNoErrors(gql(manager,
                "mutation($i: ServiceCategoryInput!) { createServiceCategory(input: $i) { id } }",
                Map.of("i", Map.of("name", "Booking cat " + UUID.randomUUID())))).read("$.data.createServiceCategory.id");
        return assertNoErrors(gql(manager,
                "mutation($i: ServiceInput!) { createService(input: $i) { id } }",
                Map.of("i", Map.of("categoryId", catId, "name", "Oil change", "summary", "Fast", "priceType", "FIXED",
                        "priceAmount", "50000", "durationMinutes", minutes)))).read("$.data.createService.id");
    }

    private Map<String, Object> bookingInput(String serviceId, String startIso) {
        Map<String, Object> m = new HashMap<>();
        m.put("serviceId", serviceId);
        m.put("fullName", "Booker");
        m.put("email", "booker-" + UUID.randomUUID() + "@example.test");
        m.put("phone", "+255700000002");
        m.put("vehicleDescription", "2018 Toyota Corolla T 123 ABC");
        m.put("scheduledStart", startIso);
        m.put("requestToken", UUID.randomUUID().toString());
        return m;
    }

    @Test
    void workshopCapacityPreventsOverbooking() {
        String advisor = tokenFor(Role.SERVICE_ADVISOR);
        String manager = tokenFor(Role.MANAGER);
        String serviceId = createServiceWithDuration(manager, 60);
        assertNoErrors(gql(advisor,
                "mutation($i: CapacityInput!) { setWorkshopCapacity(input: $i) { maxConcurrentJobs } }",
                Map.of("i", Map.of("maxConcurrentJobs", 1))));

        // A valid slot tomorrow at 10:00 business time.
        String slot = ZonedDateTime.now(TZ).plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0)
                .toOffsetDateTime().toString();
        String ref = assertNoErrors(gql("mutation($i: BookingInput!) { bookService(input: $i) { reference } }",
                Map.of("i", bookingInput(serviceId, slot)))).read("$.data.bookService.reference");
        assertThat(ref).startsWith("NA-BKG-");

        // The same slot is now full (capacity 1); a later slot still works.
        assertThat(errorCode(gql("mutation($i: BookingInput!) { bookService(input: $i) { reference } }",
                Map.of("i", bookingInput(serviceId, slot))))).isEqualTo("WORKSHOP_FULL");
        String later = ZonedDateTime.now(TZ).plusDays(1).withHour(14).withMinute(0).withSecond(0).withNano(0)
                .toOffsetDateTime().toString();
        assertNoErrors(gql("mutation($i: BookingInput!) { bookService(input: $i) { reference } }",
                Map.of("i", bookingInput(serviceId, later))));

        // Outside working hours and too soon are rejected.
        String night = ZonedDateTime.now(TZ).plusDays(1).withHour(3).withMinute(0).withSecond(0).withNano(0)
                .toOffsetDateTime().toString();
        assertThat(errorCode(gql("mutation($i: BookingInput!) { bookService(input: $i) { reference } }",
                Map.of("i", bookingInput(serviceId, night))))).isEqualTo("OUTSIDE_WORKING_HOURS");
        String soon = ZonedDateTime.now(TZ).plusMinutes(30).toOffsetDateTime().toString();
        assertThat(errorCode(gql("mutation($i: BookingInput!) { bookService(input: $i) { reference } }",
                Map.of("i", bookingInput(serviceId, soon))))).isIn("INVALID_TIME", "OUTSIDE_WORKING_HOURS");

        // Staff lifecycle.
        DocumentContext list = assertNoErrors(gql(advisor, "{ serviceBookings(status: PENDING) { items { id } } }", null));
        String bookingId = list.read("$.data.serviceBookings.items[0].id");
        assertNoErrors(gql(advisor,
                "mutation($id: ID!) { updateServiceBooking(id: $id, input: {status: CONFIRMED}) { status } }",
                Map.of("id", bookingId)));
        assertThat(errorCode(gql(advisor,
                "mutation($id: ID!) { updateServiceBooking(id: $id, input: {status: PENDING}) { id } }",
                Map.of("id", bookingId)))).isEqualTo("INVALID_STATUS_CHANGE");
    }

    @Test
    void quotationLifecycleFromRequestToDecision() {
        String customer = registerCustomer();
        String advisor = tokenFor(Role.SERVICE_ADVISOR);

        Map<String, Object> req = Map.of("fullName", "Quote Me", "email", "q-" + UUID.randomUUID() + "@example.test",
                "phone", "+255700000003", "workType", "PAINTING", "vehicleDescription", "2015 Subaru Forester",
                "description", "Full respray in red, minor dent repair on the bonnet.");
        String ref = assertNoErrors(gql(customer,
                "mutation($i: QuotationRequestInput!) { requestQuotation(input: $i) { reference } }",
                Map.of("i", req))).read("$.data.requestQuotation.reference");
        assertThat(ref).startsWith("NA-QTE-");

        DocumentContext staffList = assertNoErrors(gql(advisor,
                "{ quotations(status: REQUESTED) { items { id reference status } } }", null));
        String qid = staffList.read("$.data.quotations.items[0].id");
        assertThat(errorCode(gql(advisor, """
                mutation($id: ID!) { priceQuotation(id: $id, input: {quotedAmount: "500", validUntil: "2020-01-01"}) { id } }""",
                Map.of("id", qid)))).isEqualTo("INVALID_VALIDITY");
        assertNoErrors(gql(advisor, """
                mutation($id: ID!) { priceQuotation(id: $id, input: {quotedAmount: "1850000", validUntil: "%s"}) { status } }"""
                .formatted(futureDate(14)), Map.of("id", qid)));

        DocumentContext mine = assertNoErrors(gql(customer, "{ myQuotations { items { id status quotedAmount { amount } } } }",
                null));
        assertThat(mine.read("$.data.myQuotations.items[0].status", String.class)).isEqualTo("QUOTED");
        assertThat(mine.read("$.data.myQuotations.items[0].quotedAmount.amount", String.class)).isEqualTo("1850000.00");

        assertNoErrors(gql(customer, "mutation($id: ID!) { decideQuotation(id: $id, accept: true) { status } }",
                Map.of("id", qid)));
        // A decided quotation cannot be decided again, and anonymous users have no account area.
        assertThat(errorCode(gql(customer, "mutation($id: ID!) { decideQuotation(id: $id, accept: false) { id } }",
                Map.of("id", qid)))).isEqualTo("INVALID_STATUS_CHANGE");
        assertThat(errorClassification(gql(tokenFor(Role.CUSTOMER), "{ quotations { totalCount } }", null)))
                .isEqualTo("FORBIDDEN");
    }
}
