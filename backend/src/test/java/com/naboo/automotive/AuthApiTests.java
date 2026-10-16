package com.naboo.automotive;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.DocumentContext;

class AuthApiTests extends GraphQlIntegrationTest {

    private static final String REGISTER = """
            mutation($input: RegisterInput!) { register(input: $input) { token user { email roles staff } } }""";
    private static final String LOGIN = """
            mutation($input: LoginInput!) { login(input: $input) { token user { email } } }""";

    @Test
    void registerLoginAndMe() {
        String email = "Jane." + UUID.randomUUID() + "@Example.test";
        DocumentContext reg = gql(REGISTER, Map.of("input", Map.of("email", email, "password", "correct-horse-battery",
                "fullName", "Jane Doe", "phone", "+255 712 345 678")));
        assertNoErrors(reg);
        assertThat(reg.read("$.data.register.user.email", String.class)).isEqualTo(email.toLowerCase());
        assertThat(reg.read("$.data.register.user.roles", List.class)).containsExactly("CUSTOMER");
        assertThat(reg.read("$.data.register.user.staff", Boolean.class)).isFalse();

        DocumentContext login = gql(LOGIN, Map.of("input", Map.of("email", email, "password", "correct-horse-battery")));
        String token = login.read("$.data.login.token");
        assertThat(token).isNotBlank();

        DocumentContext me = gql(token, "{ me { email fullName } }", null);
        assertThat(me.read("$.data.me.fullName", String.class)).isEqualTo("Jane Doe");
        assertThat(gql("{ me { email } }", null).read("$.data.me", Object.class)).isNull();
    }

    @Test
    void duplicateEmailAndWrongPasswordAreRejected() {
        String email = "dup-" + UUID.randomUUID() + "@example.test";
        Map<String, Object> input = Map.of("email", email, "password", "correct-horse-battery", "fullName", "Dup");
        gql(REGISTER, Map.of("input", input));
        assertThat(errorCode(gql(REGISTER, Map.of("input", input)))).isEqualTo("EMAIL_TAKEN");

        DocumentContext login = gql(LOGIN, Map.of("input", Map.of("email", email, "password", "wrong-password-here")));
        assertThat(errorCode(login)).isEqualTo("INVALID_CREDENTIALS");
        assertThat(errorCode(gql(LOGIN, Map.of("input", Map.of("email", "nobody@example.test", "password", "whatever123")))))
                .isEqualTo("INVALID_CREDENTIALS");
    }

    @Test
    void weakPasswordFailsValidation() {
        DocumentContext doc = gql(REGISTER, Map.of("input",
                Map.of("email", "weak-" + UUID.randomUUID() + "@example.test", "password", "short", "fullName", "Weak")));
        assertThat(errorCode(doc)).isEqualTo("VALIDATION_FAILED");
        assertThat(doc.read("$.errors[0].extensions.fields[0].field", String.class)).isEqualTo("password");
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = tokenFor(com.naboo.automotive.users.Role.CUSTOMER);
        String tampered = token.substring(0, token.length() - 4) + "AAAA";
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.web.client.HttpClientErrorException.Unauthorized.class,
                () -> gql(tampered, "{ me { email } }", null));
    }
}
