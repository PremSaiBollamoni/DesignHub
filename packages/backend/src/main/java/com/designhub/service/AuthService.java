package com.designhub.service;

import com.designhub.domain.User;
import com.designhub.dto.AuthDtos.*;
import com.designhub.exception.ApiException;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.designhub.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final SubscriptionService subscriptions;
    private final ActivityService activity;
    private final EmailPolicy emailPolicy;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        emailPolicy.require(email);
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists. Sign in instead.");
        }
        User u = new User();
        u.setEmail(email);
        u.setName(req.name().trim());
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);
        subscriptions.assign(u.getId(), "free");
        activity.log(u.getId(), null, "account.created", null);
        log.info("Registered user {}", u.getId());
        return new AuthResponse(jwt.issue(u), UserDto.of(u));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        emailPolicy.require(req.email());
        User u = users.findByEmailIgnoreCase(req.email().trim())
                .filter(found -> encoder.matches(req.password(), found.getPasswordHash()))
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Email or password is incorrect"));
        return new AuthResponse(jwt.issue(u), UserDto.of(u));
    }

    @Transactional(readOnly = true)
    public UserDto me(AuthUser caller) {
        return UserDto.of(load(caller.id()));
    }

    @Transactional
    public AuthResponse updateProfile(AuthUser caller, UpdateProfileRequest req) {
        User u = load(caller.id());
        if (req.name() != null && !req.name().isBlank()) u.setName(req.name().trim());
        if (req.avatarUrl() != null) u.setAvatarUrl(req.avatarUrl().isBlank() ? null : req.avatarUrl());
        return new AuthResponse(jwt.issue(u), UserDto.of(u));
    }

    @Transactional
    public void changePassword(AuthUser caller, ChangePasswordRequest req) {
        User u = load(caller.id());
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
    }

    @Transactional(readOnly = true)
    public java.util.List<UserDto> search(String q) {
        if (q == null || q.trim().length() < 2) return java.util.List.of();
        return users.search(q.trim(), org.springframework.data.domain.PageRequest.of(0, 8)).stream().map(UserDto::of).toList();
    }

    private User load(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Account"));
    }
}
