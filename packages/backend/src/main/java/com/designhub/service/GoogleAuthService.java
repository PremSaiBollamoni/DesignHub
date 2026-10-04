package com.designhub.service;

import com.designhub.config.AppProperties;
import com.designhub.domain.User;
import com.designhub.dto.AuthDtos.AuthResponse;
import com.designhub.dto.AuthDtos.UserDto;
import com.designhub.exception.ApiException;
import com.designhub.repository.UserRepository;
import com.designhub.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import java.security.SecureRandom;
import java.util.Base64;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Signs people in with a Google ID token. The token is verified by Google and must have been issued for this app. */
@Slf4j
@Service
public class GoogleAuthService {
    private final String clientId;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final SubscriptionService subscriptions;
    private final ActivityService activity;
    private final EmailPolicy emailPolicy;
    private final RestClient http = RestClient.create();
    private final SecureRandom random = new SecureRandom();

    public GoogleAuthService(AppProperties props, UserRepository users, PasswordEncoder encoder, JwtService jwt,
                             SubscriptionService subscriptions, ActivityService activity, EmailPolicy emailPolicy) {
        this.emailPolicy = emailPolicy;
        this.clientId = props.google() == null || props.google().clientId() == null ? "" : props.google().clientId().trim();
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.subscriptions = subscriptions;
        this.activity = activity;
    }

    public String clientId() {
        return clientId;
    }

    @Transactional
    public AuthResponse signIn(String idToken) {
        if (clientId.isBlank()) throw ApiException.badRequest("Google sign-in is not set up on this server yet.");
        JsonNode claims;
        try {
            claims = http.get().uri("https://oauth2.googleapis.com/tokeninfo?id_token={t}", idToken).retrieve().body(JsonNode.class);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google could not confirm that sign-in. Try again.");
        }
        if (claims == null || !clientId.equals(claims.path("aud").asText()) || !"true".equals(claims.path("email_verified").asText())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "That Google account could not be verified.");
        }
        String email = claims.path("email").asText().toLowerCase();
        emailPolicy.require(email);
        String name = claims.path("name").asText(email.substring(0, email.indexOf('@')));
        User user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setName(name);
            user.setAvatarUrl(claims.path("picture").asText(null));
            byte[] raw = new byte[32];
            random.nextBytes(raw);
            // Google accounts never use a password, so store an unguessable one.
            user.setPasswordHash(encoder.encode(Base64.getEncoder().encodeToString(raw)));
            users.save(user);
            subscriptions.assign(user.getId(), "free");
            activity.log(user.getId(), null, "account.created", "google");
            log.info("Registered user {} through Google", user.getId());
        } else if (user.getAvatarUrl() == null && !claims.path("picture").isMissingNode()) {
            user.setAvatarUrl(claims.path("picture").asText(null));
        }
        return new AuthResponse(jwt.issue(user), UserDto.of(user));
    }
}
