package com.designhub.service;

import com.designhub.domain.BillingRecord;
import com.designhub.domain.Plan;
import com.designhub.domain.Subscription;
import com.designhub.exception.ApiException;
import com.designhub.repository.*;
import com.designhub.security.AuthUser;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Single source of truth for plan limits. Controllers and the UI never hardcode quotas. */
@Service
@RequiredArgsConstructor
public class SubscriptionService {
    private final PlanRepository plans;
    private final SubscriptionRepository subs;
    private final BillingRecordRepository billing;
    private final UserRepository users;
    private final ProjectRepository projects;
    private final AssetRepository assets;
    private final AIUsageRepository aiUsage;
    private final ExportJobRepository exports;

    public record PlanDto(String code, String name, int priceCents, int maxProjects, long storageBytes,
                          int aiRequestsPerMonth, int exportsPerMonth, int teamSeats) {}

    public record UsageDto(PlanDto plan, String status, Instant currentPeriodEnd, long projects, long storageBytes,
                           long aiRequests, long exports) {}

    public record BillingDto(Long id, String description, int amountCents, String status, Instant createdAt) {}

    @Transactional(readOnly = true)
    public List<PlanDto> listPlans() {
        return plans.findAll().stream().sorted((a, b) -> Integer.compare(a.getPriceCents(), b.getPriceCents())).map(this::dto).toList();
    }

    @Transactional
    public Plan planFor(Long userId) {
        return subs.findFirstByUserIdOrderByCreatedAtDesc(userId).map(Subscription::getPlan)
                .orElseGet(() -> assign(userId, "free").getPlan());
    }

    @Transactional
    public Subscription assign(Long userId, String planCode) {
        Plan plan = plans.findByCode(planCode).orElseThrow(() -> ApiException.notFound("Plan"));
        Subscription s = new Subscription();
        s.setUser(users.getReferenceById(userId));
        s.setPlan(plan);
        s.setCurrentPeriodEnd(Instant.now().plus(30, ChronoUnit.DAYS));
        return subs.save(s);
    }

    @Transactional
    public UsageDto change(AuthUser user, String planCode) {
        Subscription s = assign(user.id(), planCode);
        if (s.getPlan().getPriceCents() > 0) {
            BillingRecord r = new BillingRecord();
            r.setUser(users.getReferenceById(user.id()));
            r.setDescription(s.getPlan().getName() + " plan, 30 days");
            r.setAmountCents(s.getPlan().getPriceCents());
            r.setStatus("PAID");
            billing.save(r);
        }
        return usage(user);
    }

    @Transactional(readOnly = true)
    public UsageDto usage(AuthUser user) {
        Subscription s = subs.findFirstByUserIdOrderByCreatedAtDesc(user.id()).orElseGet(() -> assign(user.id(), "free"));
        Instant monthStart = Instant.now().minus(30, ChronoUnit.DAYS);
        return new UsageDto(dto(s.getPlan()), s.getStatus(), s.getCurrentPeriodEnd(),
                projects.countByOwnerIdAndDeletedAtIsNull(user.id()), assets.totalBytes(user.id()),
                aiUsage.countByUserIdAndCreatedAtAfter(user.id(), monthStart),
                exports.countByUserIdAndCreatedAtAfter(user.id(), monthStart));
    }

    @Transactional(readOnly = true)
    public List<BillingDto> history(AuthUser user) {
        return billing.findByUserIdOrderByCreatedAtDesc(user.id()).stream()
                .map(b -> new BillingDto(b.getId(), b.getDescription(), b.getAmountCents(), b.getStatus(), b.getCreatedAt())).toList();
    }

    @Transactional
    public void checkProjectQuota(Long userId) {
        Plan p = planFor(userId);
        if (projects.countByOwnerIdAndDeletedAtIsNull(userId) >= p.getMaxProjects()) {
            throw ApiException.limit("Your " + p.getName() + " plan allows " + p.getMaxProjects() + " designs. Delete one or upgrade to add more.");
        }
    }

    @Transactional
    public void checkStorageQuota(Long userId, long incomingBytes) {
        Plan p = planFor(userId);
        if (assets.totalBytes(userId) + incomingBytes > p.getStorageBytes()) {
            throw ApiException.limit("This upload would exceed the storage included in your " + p.getName() + " plan.");
        }
    }

    @Transactional
    public void checkAiQuota(Long userId) {
        Plan p = planFor(userId);
        long used = aiUsage.countByUserIdAndCreatedAtAfter(userId, Instant.now().minus(30, ChronoUnit.DAYS));
        if (used >= p.getAiRequestsPerMonth()) {
            throw ApiException.limit("You have used all " + p.getAiRequestsPerMonth() + " AI requests included in your " + p.getName() + " plan this month.");
        }
    }

    @Transactional
    public void checkExportQuota(Long userId) {
        Plan p = planFor(userId);
        long used = exports.countByUserIdAndCreatedAtAfter(userId, Instant.now().minus(30, ChronoUnit.DAYS));
        if (used >= p.getExportsPerMonth()) {
            throw ApiException.limit("You have used all " + p.getExportsPerMonth() + " exports included in your " + p.getName() + " plan this month.");
        }
    }

    private PlanDto dto(Plan p) {
        return new PlanDto(p.getCode(), p.getName(), p.getPriceCents(), p.getMaxProjects(), p.getStorageBytes(),
                p.getAiRequestsPerMonth(), p.getExportsPerMonth(), p.getTeamSeats());
    }
}
