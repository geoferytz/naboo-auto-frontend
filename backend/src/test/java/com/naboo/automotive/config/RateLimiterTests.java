package com.naboo.automotive.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import com.naboo.automotive.common.RateLimitedException;

class RateLimiterTests {

    @Test
    void fixedWindowLimitsPerActionAndClientAndResetsAfterAMinute() {
        // The wired app uses sensitivePerMinute=10 in prod (1000 in the test profile, so this
        // exercises the logic directly rather than hammering the API).
        Clock clock = Clock.fixed(Instant.parse("2026-10-17T10:00:00Z"), ZoneOffset.UTC);
        RateLimiter limiter = new RateLimiter(2, clock);

        assertThatCode(() -> {
            limiter.check("login", "10.0.0.1");
            limiter.check("login", "10.0.0.1");
        }).doesNotThrowAnyException();
        assertThatThrownBy(() -> limiter.check("login", "10.0.0.1")).isInstanceOf(RateLimitedException.class);

        // Different client and different action get their own buckets.
        assertThatCode(() -> {
            limiter.check("login", "10.0.0.2");
            limiter.check("register", "10.0.0.1");
        }).doesNotThrowAnyException();

        // A later minute resets the window.
        RateLimiter later = new RateLimiter(2, Clock.offset(clock, Duration.ofMinutes(2)));
        assertThatCode(() -> {
            later.check("login", "10.0.0.1");
            later.check("login", "10.0.0.1");
        }).doesNotThrowAnyException();
        assertThatThrownBy(() -> later.check("login", "10.0.0.1")).isInstanceOf(RateLimitedException.class);
    }
}
