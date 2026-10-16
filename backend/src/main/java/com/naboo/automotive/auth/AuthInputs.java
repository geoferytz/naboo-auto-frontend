package com.naboo.automotive.auth;

import java.time.Instant;

import com.naboo.automotive.users.UserView;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthInputs {

    public static final String PHONE_PATTERN = "^\\+?[0-9 ()-]{7,20}$";

    private AuthInputs() {
    }

    public record RegisterInput(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 10, max = 128, message = "must be between 10 and 128 characters") String password,
            @NotBlank @Size(max = 120) String fullName,
            @Pattern(regexp = PHONE_PATTERN, message = "must be a valid phone number") String phone) {
    }

    public record LoginInput(@NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 128) String password) {
    }

    public record AuthPayload(String token, Instant expiresAt, UserView user) {
    }
}
