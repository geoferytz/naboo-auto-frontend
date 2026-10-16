package com.naboo.automotive.users;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserView(UUID id, String email, String fullName, String phone, List<Role> roles, boolean staff,
        boolean enabled, Instant lastLoginAt, Instant createdAt) {

    public static UserView of(User user) {
        return new UserView(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(),
                user.getRoles().stream().sorted().toList(), user.isStaff(), user.isEnabled(), user.getLastLoginAt(),
                user.getCreatedAt());
    }
}
