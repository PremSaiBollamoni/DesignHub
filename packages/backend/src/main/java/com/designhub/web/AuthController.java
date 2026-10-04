package com.designhub.web;

import com.designhub.dto.AuthDtos.*;
import com.designhub.security.AuthUser;
import com.designhub.service.AuthService;
import com.designhub.service.GoogleAuthService;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final GoogleAuthService google;
    private final com.designhub.service.EmailPolicy emailPolicy;

    public record GoogleRequest(@NotBlank String credential) {}

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    /** Public, so the sign-in screen knows whether to offer Google before anyone is signed in. */
    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of("googleClientId", google.clientId(), "allowedEmailDomains", emailPolicy.domains());
    }

    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleRequest req) {
        return google.signIn(req.credential());
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthUser user) {
        return auth.me(user);
    }

    @PatchMapping("/me")
    public AuthResponse updateProfile(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody UpdateProfileRequest req) {
        return auth.updateProfile(user, req);
    }

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody ChangePasswordRequest req) {
        auth.changePassword(user, req);
    }

    @GetMapping("/users")
    public List<UserDto> search(@RequestParam String q) {
        return auth.search(q);
    }
}
