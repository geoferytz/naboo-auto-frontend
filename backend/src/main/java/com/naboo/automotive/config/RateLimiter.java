package com.naboo.automotive.config;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.naboo.automotive.common.RateLimitedException;

/**
 * Simple in-memory fixed-window limiter for sensitive public operations (login, registration, enquiries).
 * Suitable for a single backend instance; replace with a shared store if the backend is scaled horizontally.
 */
@Component
public class RateLimiter {

    private record Window(long minute, AtomicInteger count) {
    }

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int limitPerMinute;
    private final Clock clock;

    @Autowired
    public RateLimiter(AppProperties properties) {
        this(properties.rateLimit().sensitivePerMinute(), Clock.systemUTC());
    }

    RateLimiter(int limitPerMinute, Clock clock) {
        this.limitPerMinute = limitPerMinute;
        this.clock = clock;
    }

    public void check(String action, String clientKey) {
        long minute = clock.millis() / 60_000;
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> e.getValue().minute() < minute);
        }
        Window window = windows.compute(action + "|" + clientKey,
                (k, w) -> w == null || w.minute() != minute ? new Window(minute, new AtomicInteger()) : w);
        if (window.count().incrementAndGet() > limitPerMinute) {
            throw new RateLimitedException();
        }
    }
}
