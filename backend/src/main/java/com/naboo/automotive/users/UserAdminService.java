package com.naboo.automotive.users;

import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.naboo.automotive.audit.AuditService;
import com.naboo.automotive.auth.AuthInputs;
import com.naboo.automotive.auth.AuthService;
import com.naboo.automotive.common.BusinessRuleException;
import com.naboo.automotive.common.NotFoundException;
import com.naboo.automotive.common.PageView;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Service
public class UserAdminService {

    public record CreateStaffUserInput(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 120) String fullName,
            @Pattern(regexp = AuthInputs.PHONE_PATTERN, message = "must be a valid phone number") String phone,
            @NotBlank @Size(min = 12, max = 128, message = "must be between 12 and 128 characters") String password,
            @NotEmpty Set<Role> roles) {
    }

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;

    public UserAdminService(UserRepository users, PasswordEncoder passwordEncoder, AuditService audit) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<UserView> staff(boolean includeDisabled) {
        return users.findStaff(Role.CUSTOMER, includeDisabled).stream().map(UserView::of).toList();
    }

    @Transactional(readOnly = true)
    public PageView<UserView> search(String search, Integer page, Integer size) {
        String term = search == null || search.isBlank() ? "" : "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
        return PageView.of(users.search(term, PageView.request(page, size, Sort.by("fullName", "id"))), UserView::of);
    }

    @Transactional
    public UserView createStaff(CreateStaffUserInput input, UUID actor) {
        Set<Role> roles = staffRoles(input.roles());
        String email = AuthService.normaliseEmail(input.email());
        if (users.existsByEmail(email)) {
            throw new BusinessRuleException("EMAIL_TAKEN", "An account with this email already exists.");
        }
        String phone = input.phone() == null || input.phone().isBlank() ? null : input.phone().trim();
        User user = users.save(new User(email, passwordEncoder.encode(input.password()), input.fullName().trim(), phone, roles));
        audit.record(actor, "STAFF_USER_CREATED", "User", user.getId(), "roles=" + roles);
        return UserView.of(user);
    }

    @Transactional
    public UserView setRoles(UUID id, Set<Role> roles, UUID actor) {
        User user = load(id);
        Set<Role> newRoles = roles.isEmpty() ? EnumSet.of(Role.CUSTOMER) : EnumSet.copyOf(roles);
        if (newRoles.contains(Role.CUSTOMER) && newRoles.size() > 1) {
            throw new BusinessRuleException("INVALID_ROLES", "Customer accounts cannot also hold staff roles.");
        }
        boolean removesSuperAdmin = user.getRoles().contains(Role.SUPER_ADMIN) && !newRoles.contains(Role.SUPER_ADMIN);
        if (removesSuperAdmin && (id.equals(actor) || users.countEnabledWithRole(Role.SUPER_ADMIN) <= 1)) {
            throw new BusinessRuleException("LAST_SUPER_ADMIN", "You cannot remove the last or your own super admin role.");
        }
        String before = user.getRoles().toString();
        user.replaceRoles(newRoles);
        audit.record(actor, "USER_ROLES_CHANGED", "User", id, before + " -> " + newRoles);
        users.flush();
        return UserView.of(user);
    }

    @Transactional
    public UserView setEnabled(UUID id, boolean enabled, UUID actor) {
        User user = load(id);
        if (!enabled && id.equals(actor)) {
            throw new BusinessRuleException("CANNOT_DISABLE_SELF", "You cannot disable your own account.");
        }
        if (!enabled && user.getRoles().contains(Role.SUPER_ADMIN) && users.countEnabledWithRole(Role.SUPER_ADMIN) <= 1) {
            throw new BusinessRuleException("LAST_SUPER_ADMIN", "You cannot disable the last super admin.");
        }
        if (user.isEnabled() != enabled) {
            user.setEnabled(enabled);
            audit.record(actor, enabled ? "USER_ENABLED" : "USER_DISABLED", "User", id, null);
        }
        users.flush();
        return UserView.of(user);
    }

    private User load(UUID id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("User not found."));
    }

    private static Set<Role> staffRoles(Set<Role> roles) {
        if (roles.contains(Role.CUSTOMER)) {
            throw new BusinessRuleException("INVALID_ROLES", "Staff accounts cannot hold the CUSTOMER role.");
        }
        return EnumSet.copyOf(roles);
    }
}
