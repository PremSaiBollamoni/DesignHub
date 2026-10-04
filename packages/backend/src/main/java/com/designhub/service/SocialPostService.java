package com.designhub.service;

import com.designhub.domain.Access;
import com.designhub.domain.SocialAccount;
import com.designhub.domain.SocialPost;
import com.designhub.domain.SocialPost.Status;
import com.designhub.exception.ApiException;
import com.designhub.integration.social.SocialAdapter.SocialException;
import com.designhub.repository.ProjectRepository;
import com.designhub.repository.SocialPostRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Maker/approver workflow: DRAFT -> PENDING_APPROVAL -> APPROVED|REJECTED -> SCHEDULED -> PUBLISHING -> PUBLISHED|FAILED. */
@Slf4j
@Service
@RequiredArgsConstructor
public class SocialPostService {
    private final SocialPostRepository posts;
    private final SocialAccountService accounts;
    private final UserRepository users;
    private final ProjectRepository projects;
    private final AccessService access;
    private final NotificationService notifications;
    private final ActivityService activity;
    private final ApprovalService approvals;

    public record PostRequest(@NotNull Long accountId, Long projectId, @Size(max = 3000) String caption, @Size(max = 400) String mediaUrl,
                              Instant scheduledAt, Long reviewerId) {}

    public record PostDto(Long id, Long accountId, String platform, String accountName, Long projectId, String caption, String mediaUrl,
                          String status, Instant scheduledAt, Instant publishedAt, String feedback, String error, Long authorId,
                          String authorName, Long reviewerId, String reviewerName, Instant createdAt) {}

    @Transactional(readOnly = true)
    public List<PostDto> list(AuthUser user) {
        return posts.findVisible(user.id()).stream().map(this::dto).toList();
    }

    @Transactional
    public PostDto create(AuthUser user, PostRequest req) {
        SocialAccount account = accounts.owned(user, req.accountId());
        if (req.projectId() != null) {
            access.require(req.projectId(), user, Access.VIEWER);
            approvals.assertPublishable(user, req.projectId());
        }
        SocialPost p = new SocialPost();
        p.setAuthor(users.getReferenceById(user.id()));
        p.setAccount(account);
        if (req.projectId() != null) p.setProject(projects.getReferenceById(req.projectId()));
        if (req.reviewerId() != null) {
            if (req.reviewerId().equals(user.id())) throw ApiException.badRequest("Choose someone else to review this post");
            p.setReviewer(users.findById(req.reviewerId()).orElseThrow(() -> ApiException.notFound("Reviewer")));
        }
        p.setCaption(req.caption());
        p.setMediaUrl(req.mediaUrl());
        p.setScheduledAt(req.scheduledAt());
        posts.save(p);
        activity.log(user.id(), req.projectId(), "social.post.created", account.getPlatform());
        return dto(p);
    }

    @Transactional
    public PostDto submit(AuthUser user, Long id) {
        SocialPost p = authored(user, id, Status.DRAFT, Status.REJECTED);
        if (p.getReviewer() == null) throw ApiException.badRequest("Choose a reviewer before submitting for approval");
        p.setStatus(Status.PENDING_APPROVAL);
        p.setFeedback(null);
        notifications.send(p.getReviewer().getId(), "APPROVAL", user.name() + " asked you to review a " + p.getAccount().getPlatform() + " post", "/social");
        activity.log(user.id(), projectId(p), "social.post.submitted", null);
        return dto(p);
    }

    @Transactional
    public PostDto review(AuthUser user, Long id, boolean approve, String feedback) {
        SocialPost p = posts.findById(id).orElseThrow(() -> ApiException.notFound("Post"));
        if (p.getReviewer() == null || !p.getReviewer().getId().equals(user.id())) throw ApiException.forbidden("Only the assigned reviewer can review this post");
        if (p.getStatus() != Status.PENDING_APPROVAL) throw ApiException.conflict("This post is not waiting for review");
        if (!approve && (feedback == null || feedback.isBlank())) throw ApiException.badRequest("Tell the author what to change");
        p.setStatus(approve ? Status.APPROVED : Status.REJECTED);
        p.setFeedback(feedback);
        notifications.send(p.getAuthor().getId(), "APPROVAL", user.name() + (approve ? " approved" : " requested changes to") + " your " + p.getAccount().getPlatform() + " post", "/social");
        activity.log(user.id(), projectId(p), approve ? "social.post.approved" : "social.post.rejected", feedback);
        return dto(p);
    }

    /** Schedules for later, or publishes immediately when {@code at} is null. Posts with a reviewer must be approved first. */
    @Transactional
    public PostDto publish(AuthUser user, Long id, Instant at) {
        SocialPost p = authored(user, id, Status.DRAFT, Status.APPROVED, Status.SCHEDULED, Status.FAILED);
        if (p.getProject() != null) approvals.assertPublishable(user, p.getProject().getId());
        if (p.getReviewer() != null && p.getStatus() != Status.APPROVED && p.getStatus() != Status.SCHEDULED && p.getStatus() != Status.FAILED) {
            throw ApiException.conflict("This post needs approval before it can be published");
        }
        if (at != null && at.isAfter(Instant.now().plusSeconds(30))) {
            p.setScheduledAt(at);
            p.setStatus(Status.SCHEDULED);
            return dto(p);
        }
        return dto(deliver(p));
    }

    @Transactional
    public void delete(AuthUser user, Long id) {
        SocialPost p = authored(user, id, Status.DRAFT, Status.REJECTED, Status.SCHEDULED, Status.FAILED, Status.PENDING_APPROVAL, Status.APPROVED);
        posts.delete(p);
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 20_000)
    @Transactional
    public void publishDue() {
        for (SocialPost p : posts.findByStatusAndScheduledAtLessThanEqual(Status.SCHEDULED, Instant.now())) {
            deliver(p);
        }
    }

    private SocialPost deliver(SocialPost p) {
        p.setStatus(Status.PUBLISHING);
        try {
            var account = p.getAccount();
            String externalId = accounts.adapter(account.getPlatform())
                    .publish(accounts.accessToken(account), account.getExternalId(), p.getCaption() == null ? "" : p.getCaption(), p.getMediaUrl());
            p.setExternalPostId(externalId);
            p.setStatus(Status.PUBLISHED);
            p.setPublishedAt(Instant.now());
            p.setError(null);
            notifications.send(p.getAuthor().getId(), "PUBLISHING", "Your " + account.getPlatform() + " post is live", "/social");
            activity.log(p.getAuthor().getId(), projectId(p), "social.post.published", account.getPlatform());
        } catch (SocialException e) {
            p.setStatus(Status.FAILED);
            p.setError(e.getMessage());
            notifications.send(p.getAuthor().getId(), "PUBLISHING", "Your " + p.getAccount().getPlatform() + " post could not be published", "/social");
        }
        return p;
    }

    private SocialPost authored(AuthUser user, Long id, Status... allowed) {
        SocialPost p = posts.findById(id).orElseThrow(() -> ApiException.notFound("Post"));
        if (!p.getAuthor().getId().equals(user.id())) throw ApiException.forbidden("Only the author can change this post");
        if (!List.of(allowed).contains(p.getStatus())) throw ApiException.conflict("This post is " + p.getStatus().name().toLowerCase().replace('_', ' ') + " and cannot be changed that way");
        return p;
    }

    private Long projectId(SocialPost p) {
        return p.getProject() == null ? null : p.getProject().getId();
    }

    private PostDto dto(SocialPost p) {
        return new PostDto(p.getId(), p.getAccount().getId(), p.getAccount().getPlatform(), p.getAccount().getDisplayName(), projectId(p),
                p.getCaption(), p.getMediaUrl(), p.getStatus().name(), p.getScheduledAt(), p.getPublishedAt(), p.getFeedback(), p.getError(),
                p.getAuthor().getId(), p.getAuthor().getName(), p.getReviewer() == null ? null : p.getReviewer().getId(),
                p.getReviewer() == null ? null : p.getReviewer().getName(), p.getCreatedAt());
    }
}
