package com.naboo.automotive.users;

import java.util.List;
import java.util.UUID;

public record UserView(UUID id, String email, String fullName, String phone, List<Role> roles, boolean staff) {

    public static UserView of(User user) {
        return new UserView(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(),
                user.getRoles().stream().sorted().toList(), user.isStaff());
    }
}
