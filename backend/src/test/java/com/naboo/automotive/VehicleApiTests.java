package com.naboo.automotive;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.DocumentContext;
import com.naboo.automotive.users.Role;

class VehicleApiTests extends GraphQlIntegrationTest {

    private static final String CREATE = """
            mutation($input: VehicleInput!) { createVehicle(input: $input) { id slug status published registrationNumber price { amount currency } } }""";
    private static final String PUBLISH = """
            mutation($id: ID!) { setVehiclePublished(id: $id, published: true) { id published } }""";
    private static final String SET_STATUS = """
            mutation($id: ID!, $status: VehicleStatus!) { setVehicleStatus(id: $id, status: $status) { status statusHistory { fromStatus toStatus } } }""";
    private static final String SEARCH = """
            query($filter: VehicleFilter) { vehicles(filter: $filter, size: 50) { totalCount items { id slug status registrationNumber statusHistory { toStatus } } } }""";
    private static final String ENQUIRE = """
            mutation($input: VehicleEnquiryInput!) { submitVehicleEnquiry(input: $input) { reference } }""";

    private Map<String, Object> vehicleInput(String make, String price) {
        Map<String, Object> input = new HashMap<>();
        input.put("make", make);
        input.put("model", "Testmodel");
        input.put("year", 2019);
        input.put("mileageKm", 50000);
        input.put("fuelType", "PETROL");
        input.put("transmission", "AUTOMATIC");
        input.put("bodyType", "SUV");
        input.put("condition", "FOREIGN_USED");
        input.put("registrationNumber", "T123ABC");
        input.put("priceAmount", price);
        input.put("features", List.of("Air conditioning", "Reverse camera"));
        return input;
    }

    private String createPublished(String staffToken, String make) {
        DocumentContext created = assertNoErrors(gql(staffToken, CREATE, Map.of("input", vehicleInput(make, "45000000"))));
        String id = created.read("$.data.createVehicle.id");
        assertNoErrors(gql(staffToken, PUBLISH, Map.of("id", id)));
        return id;
    }

    @Test
    void anonymousAndCustomersCannotManageVehicles() {
        Map<String, Object> vars = Map.of("input", vehicleInput("Blocked", "1000"));
        assertThat(errorClassification(gql(CREATE, vars))).isEqualTo("UNAUTHORIZED");
        assertThat(errorClassification(gql(tokenFor(Role.CUSTOMER), CREATE, vars))).isEqualTo("FORBIDDEN");
        assertThat(errorClassification(gql(tokenFor(Role.MECHANIC), CREATE, vars))).isEqualTo("FORBIDDEN");
        assertThat(errorClassification(gql(tokenFor(Role.CUSTOMER), "{ salesEnquiries { totalCount } }", null)))
                .isEqualTo("FORBIDDEN");
    }

    @Test
    void onlyPublishedListingsArePublicAndPrivateFieldsAreHidden() {
        String staff = tokenFor(Role.SALES_AGENT);
        String make = "Pubtest" + UUID.randomUUID().toString().substring(0, 6);
        DocumentContext created = gql(staff, CREATE, Map.of("input", vehicleInput(make, "45000000.50")));
        assertNoErrors(created);
        assertThat(created.read("$.data.createVehicle.published", Boolean.class)).isFalse();
        assertThat(created.read("$.data.createVehicle.registrationNumber", String.class)).isEqualTo("T123ABC");
        assertThat(created.read("$.data.createVehicle.price.amount", String.class)).isEqualTo("45000000.50");
        assertThat(created.read("$.data.createVehicle.price.currency", String.class)).isEqualTo("TZS");
        String id = created.read("$.data.createVehicle.id");
        String slug = created.read("$.data.createVehicle.slug");

        Map<String, Object> filter = Map.of("filter", Map.of("make", make));
        assertThat(gql(SEARCH, filter).read("$.data.vehicles.totalCount", Integer.class)).isZero();
        assertThat(gql("query($s: String!) { vehicleBySlug(slug: $s) { id } }", Map.of("s", slug))
                .read("$.data.vehicleBySlug", Object.class)).isNull();

        gql(staff, PUBLISH, Map.of("id", id));
        DocumentContext search = gql(SEARCH, filter);
        assertThat(search.read("$.data.vehicles.totalCount", Integer.class)).isEqualTo(1);
        assertThat(search.read("$.data.vehicles.items[0].registrationNumber", Object.class)).isNull();
        assertThat(search.read("$.data.vehicles.items[0].statusHistory", Object.class)).isNull();

        gql(staff, SET_STATUS, Map.of("id", id, "status", "UNAVAILABLE"));
        assertThat(gql(SEARCH, filter).read("$.data.vehicles.totalCount", Integer.class)).isZero();
    }

    @Test
    void soldVehiclesAreMarkedAndRejectEnquiries() {
        String staff = tokenFor(Role.MANAGER);
        String make = "Soldtest" + UUID.randomUUID().toString().substring(0, 6);
        String id = createPublished(staff, make);

        DocumentContext sold = assertNoErrors(gql(staff, SET_STATUS, Map.of("id", id, "status", "SOLD")));
        assertThat(sold.read("$.data.setVehicleStatus.statusHistory[0].toStatus", String.class)).isEqualTo("SOLD");
        assertThat(sold.read("$.data.setVehicleStatus.statusHistory[0].fromStatus", String.class)).isEqualTo("AVAILABLE");

        assertThat(gql(SEARCH, Map.of("filter", Map.of("make", make))).read("$.data.vehicles.totalCount", Integer.class)).isZero();
        DocumentContext withSold = gql(SEARCH, Map.of("filter", Map.of("make", make, "includeSold", true)));
        assertThat(withSold.read("$.data.vehicles.items[0].status", String.class)).isEqualTo("SOLD");

        DocumentContext enquiry = gql(ENQUIRE, Map.of("input", Map.of("vehicleId", id, "type", "GENERAL",
                "fullName", "Buyer", "email", "buyer@example.test", "phone", "+255712000000")));
        assertThat(errorCode(enquiry)).isEqualTo("VEHICLE_NOT_AVAILABLE");
    }

    @Test
    void enquiriesAndViewingRequestsAreValidated() {
        String staff = tokenFor(Role.SALES_AGENT);
        String id = createPublished(staff, "Enqtest" + UUID.randomUUID().toString().substring(0, 6));
        Map<String, Object> base = Map.of("vehicleId", id, "fullName", "Buyer", "email", "buyer@example.test",
                "phone", "+255712000000");

        Map<String, Object> general = new HashMap<>(base);
        general.put("type", "GENERAL");
        String reference = gql(ENQUIRE, Map.of("input", general)).read("$.data.submitVehicleEnquiry.reference");
        assertThat(reference).startsWith("NA-ENQ-");

        Map<String, Object> pastViewing = new HashMap<>(base);
        pastViewing.put("type", "VIEWING");
        pastViewing.put("preferredViewingAt", Instant.now().minus(1, ChronoUnit.DAYS).toString());
        assertThat(errorCode(gql(ENQUIRE, Map.of("input", pastViewing)))).isEqualTo("INVALID_VIEWING_TIME");

        Map<String, Object> viewing = new HashMap<>(base);
        viewing.put("type", "VIEWING");
        viewing.put("preferredViewingAt", Instant.now().plus(2, ChronoUnit.DAYS).toString());
        assertNoErrors(gql(ENQUIRE, Map.of("input", viewing)));

        DocumentContext list = gql(staff, "{ salesEnquiries(status: NEW, size: 50) { items { reference vehicle { id } } } }", null);
        List<String> refs = list.read("$.data.salesEnquiries.items[*].reference");
        assertThat(refs).contains(reference);
    }

    @Test
    void invalidPricesAreRejected() {
        String staff = tokenFor(Role.SUPER_ADMIN);
        assertThat(errorCode(gql(staff, CREATE, Map.of("input", vehicleInput("Neg", "-5"))))).isEqualTo("INVALID_AMOUNT");
        assertThat(errorCode(gql(staff, CREATE, Map.of("input", vehicleInput("Frac", "10.123"))))).isEqualTo("INVALID_AMOUNT");
        assertThat(errorCode(gql(staff, CREATE, Map.of("input", vehicleInput("Nan", "abc"))))).isEqualTo("INVALID_AMOUNT");
    }
}
