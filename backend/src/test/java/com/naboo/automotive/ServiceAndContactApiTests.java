package com.naboo.automotive;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.DocumentContext;
import com.naboo.automotive.users.Role;

class ServiceAndContactApiTests extends GraphQlIntegrationTest {

    private static final String CREATE_CATEGORY = """
            mutation($input: ServiceCategoryInput!) { createServiceCategory(input: $input) { id slug } }""";
    private static final String CREATE_SERVICE = """
            mutation($input: ServiceInput!) { createService(input: $input) { id slug priceType price { amount currency } } }""";

    @Test
    void managersMaintainCatalogueAndPublicSeesActiveServices() {
        String manager = tokenFor(Role.MANAGER);
        String name = "Cat " + UUID.randomUUID().toString().substring(0, 6);
        DocumentContext cat = gql(manager, CREATE_CATEGORY, Map.of("input", Map.of("name", name)));
        String categoryId = cat.read("$.data.createServiceCategory.id");
        String categorySlug = cat.read("$.data.createServiceCategory.slug");

        Map<String, Object> fixed = new HashMap<>(Map.of("categoryId", categoryId, "name", "Fixed " + name,
                "summary", "Fixed price work", "priceType", "FIXED", "priceAmount", "50000"));
        DocumentContext created = gql(manager, CREATE_SERVICE, Map.of("input", fixed));
        assertThat(created.read("$.data.createService.price.amount", String.class)).isEqualTo("50000.00");

        Map<String, Object> quote = new HashMap<>(Map.of("categoryId", categoryId, "name", "Quote " + name,
                "summary", "Quoted work", "priceType", "QUOTE_REQUIRED", "priceAmount", "999"));
        assertThat(gql(manager, CREATE_SERVICE, Map.of("input", quote)).read("$.data.createService.price", Object.class))
                .isNull();

        Map<String, Object> missingPrice = new HashMap<>(Map.of("categoryId", categoryId, "name", "Hourly " + name,
                "summary", "Hourly work", "priceType", "HOURLY"));
        assertThat(errorCode(gql(manager, CREATE_SERVICE, Map.of("input", missingPrice)))).isEqualTo("PRICE_REQUIRED");

        Map<String, Object> inactive = new HashMap<>(Map.of("categoryId", categoryId, "name", "Hidden " + name,
                "summary", "Hidden", "priceType", "INSPECTION_REQUIRED", "active", false));
        gql(manager, CREATE_SERVICE, Map.of("input", inactive));

        DocumentContext publicList = gql("query($c: String) { services(categorySlug: $c) { name priceType } }",
                Map.of("c", categorySlug));
        List<String> names = publicList.read("$.data.services[*].name");
        assertThat(names).containsExactly("Fixed " + name, "Quote " + name);

        assertThat(errorClassification(gql(tokenFor(Role.SALES_AGENT), CREATE_CATEGORY, Map.of("input", Map.of("name", "x")))))
                .isEqualTo("FORBIDDEN");
    }

    @Test
    void contactEnquiriesAreStoredAndOnlyVisibleToStaff() {
        DocumentContext receipt = gql("""
                mutation($input: ContactEnquiryInput!) { submitContactEnquiry(input: $input) { reference } }""",
                Map.of("input", Map.of("fullName", "Visitor", "email", "visitor@example.test", "subject", "Hello",
                        "message", "Do you import vehicles on request?")));
        String reference = receipt.read("$.data.submitContactEnquiry.reference");
        assertThat(reference).startsWith("NA-CON-");

        String query = "{ contactEnquiries(size: 50) { items { reference } } }";
        assertThat(errorClassification(gql(query, null))).isEqualTo("UNAUTHORIZED");
        List<String> refs = gql(tokenFor(Role.MANAGER), query, null).read("$.data.contactEnquiries.items[*].reference");
        assertThat(refs).contains(reference);
    }
}
