package com.designhub.web;

import com.designhub.domain.Access;
import com.designhub.domain.ProductUpdate;
import com.designhub.repository.ProductUpdateRepository;
import com.designhub.security.AuthUser;
import com.designhub.service.ActivityService;
import com.designhub.service.ActivityService.ActivityDto;
import com.designhub.service.AccessService;
import com.designhub.service.NotificationService;
import com.designhub.service.NotificationService.NotificationDto;
import com.designhub.service.PreferenceService;
import com.designhub.service.PreferenceService.EmailSettingsDto;
import com.designhub.service.SubscriptionService;
import com.designhub.service.SubscriptionService.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Per-user account surfaces: preferences, email settings, notifications, activity, product updates and billing. */
@RestController
@RequiredArgsConstructor
public class AccountController {
    private final PreferenceService preferences;
    private final NotificationService notifications;
    private final ActivityService activity;
    private final AccessService access;
    private final SubscriptionService subscriptions;
    private final ProductUpdateRepository productUpdates;

    public record PrefValue(String value) {}

    public record PlanChange(String planCode) {}

    public record ProductUpdateDto(Long id, String title, String body, Instant createdAt) {}

    @GetMapping("/api/preferences")
    public Map<String, String> prefs(@AuthenticationPrincipal AuthUser user) {
        return preferences.all(user);
    }

    @PutMapping("/api/preferences/{key}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void putPref(@AuthenticationPrincipal AuthUser user, @PathVariable String key, @RequestBody PrefValue body) {
        preferences.put(user, key, body.value());
    }

    @GetMapping("/api/email-settings")
    public EmailSettingsDto emailSettings(@AuthenticationPrincipal AuthUser user) {
        return preferences.emailSettings(user);
    }

    @PutMapping("/api/email-settings")
    public EmailSettingsDto updateEmailSettings(@AuthenticationPrincipal AuthUser user, @RequestBody EmailSettingsDto body) {
        return preferences.updateEmailSettings(user, body);
    }

    @GetMapping("/api/notifications")
    public List<NotificationDto> notifications(@AuthenticationPrincipal AuthUser user, @RequestParam(defaultValue = "30") int limit) {
        return notifications.list(user, limit);
    }

    @GetMapping("/api/notifications/unread-count")
    public Map<String, Long> unread(@AuthenticationPrincipal AuthUser user) {
        return Map.of("count", notifications.unread(user));
    }

    @PostMapping("/api/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        notifications.markRead(user, id);
    }

    @PostMapping("/api/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void readAll(@AuthenticationPrincipal AuthUser user) {
        notifications.markAllRead(user);
    }

    @GetMapping("/api/activity")
    public List<ActivityDto> activity(@AuthenticationPrincipal AuthUser user, @RequestParam(required = false) Long projectId,
                                      @RequestParam(defaultValue = "40") int limit) {
        if (projectId == null) return activity.forUser(user, limit);
        access.require(projectId, user, Access.VIEWER);
        return activity.forProject(projectId, limit);
    }

    @GetMapping("/api/product-updates")
    public List<ProductUpdateDto> updates() {
        return productUpdates.findTop20ByOrderByCreatedAtDesc().stream()
                .map((ProductUpdate u) -> new ProductUpdateDto(u.getId(), u.getTitle(), u.getBody(), u.getCreatedAt())).toList();
    }

    @GetMapping("/api/subscription")
    public UsageDto usage(@AuthenticationPrincipal AuthUser user) {
        return subscriptions.usage(user);
    }

    @GetMapping("/api/subscription/plans")
    public List<PlanDto> plans() {
        return subscriptions.listPlans();
    }

    @GetMapping("/api/subscription/billing")
    public List<BillingDto> billing(@AuthenticationPrincipal AuthUser user) {
        return subscriptions.history(user);
    }

    @PostMapping("/api/subscription/change")
    public UsageDto change(@AuthenticationPrincipal AuthUser user, @RequestBody PlanChange body) {
        return subscriptions.change(user, body.planCode());
    }
}
