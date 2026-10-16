package com.naboo.automotive.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String publicUrl,
        List<String> corsOrigins,
        String currency,
        String timezone,
        Jwt jwt,
        BootstrapAdmin bootstrapAdmin,
        RateLimit rateLimit,
        Storage storage) {

    public record Jwt(String secret, long ttlMinutes, String issuer) {
    }

    public record BootstrapAdmin(String email, String password, String fullName) {
    }

    public record RateLimit(int sensitivePerMinute) {
    }

    public record Storage(String localDir) {
    }
}
