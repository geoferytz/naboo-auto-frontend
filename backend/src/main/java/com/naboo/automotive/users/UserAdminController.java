package com.naboo.automotive.users;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;

import com.naboo.automotive.auth.CurrentUser;
import com.naboo.automotive.auth.Permissions;
import com.naboo.automotive.common.PageView;
import com.naboo.automotive.users.UserAdminService.CreateStaffUserInput;

import jakarta.validation.Valid;

@Controller
public class UserAdminController {

    private final UserAdminService service;

    public UserAdminController(UserAdminService service) {
        this.service = service;
    }

    @QueryMapping
    @PreAuthorize(Permissions.STAFF)
    public List<UserView> staffUsers(@Argument Boolean includeDisabled) {
        return service.staff(Boolean.TRUE.equals(includeDisabled));
    }

    @QueryMapping
    @PreAuthorize(Permissions.USER_MANAGE)
    public PageView<UserView> users(@Argument String search, @Argument Integer page, @Argument Integer size) {
        return service.search(search, page, size);
    }

    @MutationMapping
    @PreAuthorize(Permissions.USER_MANAGE)
    public UserView createStaffUser(@Argument @Valid CreateStaffUserInput input, @AuthenticationPrincipal Jwt jwt) {
        return service.createStaff(input, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.USER_MANAGE)
    public UserView setUserRoles(@Argument UUID id, @Argument Set<Role> roles, @AuthenticationPrincipal Jwt jwt) {
        return service.setRoles(id, roles, CurrentUser.id(jwt));
    }

    @MutationMapping
    @PreAuthorize(Permissions.USER_MANAGE)
    public UserView setUserEnabled(@Argument UUID id, @Argument boolean enabled, @AuthenticationPrincipal Jwt jwt) {
        return service.setEnabled(id, enabled, CurrentUser.id(jwt));
    }
}
