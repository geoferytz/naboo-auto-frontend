package com.naboo.automotive;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import com.naboo.automotive.users.Role;

class AdminApiTests extends GraphQlIntegrationTest {

    private static final String CREATE_STAFF = """
            mutation($input: CreateStaffUserInput!) { createStaffUser(input: $input) { id email roles staff enabled } }""";

    private String createVehicle(String token) {
        Map<String, Object> input = new HashMap<>(Map.of("make", "Upload", "model", "Test", "year", 2020, "fuelType", "PETROL",
                "transmission", "MANUAL", "bodyType", "SEDAN", "condition", "NEW", "priceAmount", "1000000"));
        return assertNoErrors(gql(token, "mutation($input: VehicleInput!) { createVehicle(input: $input) { id } }",
                Map.of("input", input))).read("$.data.createVehicle.id");
    }

    private ResponseEntity<String> upload(String token, String vehicleId, byte[] bytes, String filename) {
        LinkedMultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("file", new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        parts.add("altText", "Front three-quarter view");
        RestClient.RequestBodySpec req = RestClient.create("http://localhost:" + port).post()
                .uri("/api/uploads/vehicles/{id}/images", vehicleId).contentType(MediaType.MULTIPART_FORM_DATA);
        if (token != null) {
            req.header("Authorization", "Bearer " + token);
        }
        return req.body(parts).retrieve().onStatus(HttpStatusCode::isError, (rq, rs) -> { }).toEntity(String.class);
    }

    private static byte[] png(int w, int h) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        img.setRGB(1, 1, 0xFFE52B36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    @Test
    void photoUploadIsValidatedReEncodedAndServed() throws Exception {
        String staff = tokenFor(Role.SALES_AGENT);
        String vehicleId = createVehicle(staff);

        ResponseEntity<String> ok = upload(staff, vehicleId, png(3000, 1500), "photo.png");
        assertThat(ok.getStatusCode()).isEqualTo(HttpStatus.OK);
        String url = JsonPath.read(ok.getBody(), "$.url");
        assertThat(url).startsWith("/uploads/public/vehicles/").endsWith(".jpg");

        ResponseEntity<byte[]> served = RestClient.create("http://localhost:" + port).get().uri(url).retrieve().toEntity(byte[].class);
        assertThat(served.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_JPEG);
        BufferedImage stored = ImageIO.read(new java.io.ByteArrayInputStream(served.getBody()));
        assertThat(stored.getWidth()).isEqualTo(2000);
        assertThat(stored.getHeight()).isEqualTo(1000);

        ResponseEntity<String> fake = upload(staff, vehicleId, "<?php echo 1; ?>".getBytes(), "evil.jpg");
        assertThat(fake.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fake.getBody()).contains("UNSUPPORTED_IMAGE");

        assertThat(upload(null, vehicleId, png(10, 10), "a.png").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(upload(tokenFor(Role.CUSTOMER), vehicleId, png(10, 10), "a.png").getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void superAdminManagesStaffAndChangesApplyImmediately() {
        String admin = tokenFor(Role.SUPER_ADMIN);
        String email = "agent-" + UUID.randomUUID() + "@example.test";
        Map<String, Object> input = Map.of("email", email, "fullName", "Agent", "password", "a-very-long-password",
                "roles", List.of("SALES_AGENT"));

        assertThat(errorClassification(gql(tokenFor(Role.MANAGER), CREATE_STAFF, Map.of("input", input)))).isEqualTo("FORBIDDEN");
        DocumentContext created = assertNoErrors(gql(admin, CREATE_STAFF, Map.of("input", input)));
        String id = created.read("$.data.createStaffUser.id");
        assertThat(created.read("$.data.createStaffUser.staff", Boolean.class)).isTrue();

        String agentToken = assertNoErrors(gql("mutation($i: LoginInput!) { login(input: $i) { token } }",
                Map.of("i", Map.of("email", email, "password", "a-very-long-password")))).read("$.data.login.token");
        assertNoErrors(gql(agentToken, "{ salesEnquiries { totalCount } }", null));

        assertNoErrors(gql(admin, "mutation($id: ID!) { setUserRoles(id: $id, roles: [MECHANIC]) { roles } }", Map.of("id", id)));
        assertThat(errorClassification(gql(agentToken, "{ salesEnquiries { totalCount } }", null))).isEqualTo("FORBIDDEN");

        assertNoErrors(gql(admin, "mutation($id: ID!) { setUserEnabled(id: $id, enabled: false) { enabled } }", Map.of("id", id)));
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.web.client.HttpClientErrorException.Unauthorized.class,
                () -> gql(agentToken, "{ me { id } }", null));
    }

    @Test
    void customerRolesCannotBeMixedAndAdminsCannotDisableThemselves() {
        String admin = tokenFor(Role.SUPER_ADMIN);
        String adminId = assertNoErrors(gql(admin, "{ me { id } }", null)).read("$.data.me.id");
        assertThat(errorCode(gql(admin, "mutation($id: ID!) { setUserEnabled(id: $id, enabled: false) { id } }",
                Map.of("id", adminId)))).isEqualTo("CANNOT_DISABLE_SELF");
        assertThat(errorCode(gql(admin, "mutation($id: ID!) { setUserRoles(id: $id, roles: [MANAGER]) { id } }",
                Map.of("id", adminId)))).isEqualTo("LAST_SUPER_ADMIN");
        Map<String, Object> mixed = Map.of("email", "mix-" + UUID.randomUUID() + "@example.test", "fullName", "Mix",
                "password", "a-very-long-password", "roles", List.of("CUSTOMER", "MANAGER"));
        assertThat(errorCode(gql(admin, CREATE_STAFF, Map.of("input", mixed)))).isEqualTo("INVALID_ROLES");
    }

    @Test
    void dashboardAndAuditAreStaffOnly() {
        String manager = tokenFor(Role.MANAGER);
        String vehicleId = createVehicle(manager);
        assertNoErrors(gql(manager, "{ adminDashboard { vehiclesAvailable vehiclesUnpublished newSalesEnquiries } }", null));
        assertThat(errorClassification(gql(tokenFor(Role.CUSTOMER), "{ adminDashboard { vehiclesAvailable } }", null)))
                .isEqualTo("FORBIDDEN");

        DocumentContext audit = assertNoErrors(gql(manager, """
                query($id: String) { auditLogs(entityType: "Vehicle", entityId: $id) { items { action actorName } } }""",
                Map.of("id", vehicleId)));
        List<String> actions = audit.read("$.data.auditLogs.items[*].action");
        assertThat(actions).contains("VEHICLE_CREATED");
        assertThat(errorClassification(gql(tokenFor(Role.SALES_AGENT), "{ auditLogs { totalCount } }", null))).isEqualTo("FORBIDDEN");
    }
}
