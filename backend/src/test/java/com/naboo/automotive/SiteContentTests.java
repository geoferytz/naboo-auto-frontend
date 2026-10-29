package com.naboo.automotive;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.DocumentContext;
import com.naboo.automotive.users.Role;

class SiteContentTests extends GraphQlIntegrationTest {

    private static final String READ = "query { siteContent }";
    private static final String UPDATE = "mutation($content: String!) { updateSiteContent(content: $content) }";

    @Test
    void anonymousAndNonManagersCannotUpdateSiteContent() {
        Map<String, Object> vars = Map.of("content", "{\"phone\":\"+255 1\"}");
        assertThat(errorClassification(gql(UPDATE, vars))).isEqualTo("UNAUTHORIZED");
        assertThat(errorClassification(gql(tokenFor(Role.SALES_AGENT), UPDATE, vars))).isEqualTo("FORBIDDEN");
    }

    @Test
    void managersUpdateSiteContentAndPublicReadsItBack() {
        String json = "{\"phone\":\"+255 684 455 740\",\"whatsapp\":\"255684455740\",\"heroSlides\":[]}";
        DocumentContext updated = gql(tokenFor(Role.MANAGER), UPDATE, Map.of("content", json));
        assertThat(assertNoErrors(updated).read("$.data.updateSiteContent", String.class)).contains("255684455740");

        DocumentContext read = gql(READ, Map.of());
        assertThat(read.read("$.data.siteContent", String.class)).contains("+255 684 455 740");
    }

    @Test
    void invalidJsonIsRejected() {
        DocumentContext doc = gql(tokenFor(Role.SUPER_ADMIN), UPDATE, Map.of("content", "not json"));
        assertThat(errorCode(doc)).isEqualTo("INVALID_SITE_CONTENT");
    }
}
