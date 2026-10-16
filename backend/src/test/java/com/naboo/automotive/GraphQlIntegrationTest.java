package com.naboo.automotive;

import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestClient;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import com.naboo.automotive.auth.JwtService;
import com.naboo.automotive.users.Role;
import com.naboo.automotive.users.User;
import com.naboo.automotive.users.UserRepository;

/** Base class: full application over real HTTP against a disposable PostgreSQL container. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
abstract class GraphQlIntegrationTest {

    @LocalServerPort
    int port;

    @Autowired
    UserRepository users;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    JwtService jwtService;

    DocumentContext gql(String token, String query, Map<String, Object> variables) {
        RestClient.RequestBodySpec request = RestClient.create("http://localhost:" + port).post().uri("/graphql")
                .contentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        Map<String, Object> body = new HashMap<>();
        body.put("query", query);
        body.put("variables", variables == null ? Map.of() : variables);
        return JsonPath.parse(request.body(body).retrieve().body(String.class));
    }

    DocumentContext gql(String query, Map<String, Object> variables) {
        return gql(null, query, variables);
    }

    /** Creates a user directly in the database and returns a valid access token for it. */
    String tokenFor(Role... roles) {
        User user = users.save(new User("user-" + UUID.randomUUID() + "@example.test", passwordEncoder.encode("irrelevant-pw"),
                "Test User", null, EnumSet.of(roles[0], roles)));
        return jwtService.issue(user).token();
    }

    static DocumentContext assertNoErrors(DocumentContext doc) {
        Map<String, Object> root = doc.json();
        if (root.containsKey("errors")) {
            throw new AssertionError("Unexpected GraphQL errors: " + doc.jsonString());
        }
        return doc;
    }

    static String errorClassification(DocumentContext doc) {
        return doc.read("$.errors[0].extensions.classification");
    }

    static String errorCode(DocumentContext doc) {
        return doc.read("$.errors[0].extensions.code");
    }
}
