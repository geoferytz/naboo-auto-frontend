package com.naboo.automotive.auth;

import java.util.UUID;

import org.springframework.security.oauth2.jwt.Jwt;

public final class CurrentUser {

    private CurrentUser() {
    }

    /** Returns the authenticated user's id, or {@code null} for anonymous requests. */
    public static UUID id(Jwt jwt) {
        return jwt == null ? null : UUID.fromString(jwt.getSubject());
    }
}
