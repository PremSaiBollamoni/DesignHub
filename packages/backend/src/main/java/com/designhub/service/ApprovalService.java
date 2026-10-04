package com.designhub.service;

import com.designhub.config.AppProperties;
import com.designhub.domain.*;
import com.designhub.domain.DesignApproval.Status;
import com.designhub.exception.ApiException;
import com.designhub.integration.mail.MailService;
import com.designhub.integration.mail.MailService.Delivery;
import com.designhub.integration.mail.MailService.Mail;
import com.designhub.integration.mail.MailTemplates;
import com.designhub.repository.*;
import com.designhub.security.AuthUser;
import com.designhub.ws.ProjectBroadcaster;
import java.time.Instant;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Maker/editor approval for team designs. A Maker sends a design to the team's Editors; any one Editor approves or asks
 * for changes. Approval is tied to the design revision, so editing afterwards voids it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalService {
    private final DesignApprovalRepository approvals;
    private final ProjectRepository projects;
    private final TeamMemberRepository teamMembers;
    private final UserRepository users;
    private final EmailSettingRepository emailSettings;
    private final AccessService access;
    private final NotificationService notifications;
    private final ActivityService activity;
    private final MailService mail;
    private final ProjectBroadcaster broadcaster;
    private final AppProperties props;
    private final PlatformTransactionManager tm;

    public record ApprovalDto(String status, Long id, Long teamId, String teamName, Long requestedById, String requestedBy, String message,
                              String feedback, String caption, String decidedBy, Instant decidedAt, Instant requestedAt,
                              boolean canSubmit, boolean canReview, boolean canPublish, List<String> reviewers) {}

    public record DeliveryDto(String email, String name, boolean sent, String problem) {}

    /** Plain copy of a person, taken while the transaction is open. */
    private record Person(Long id, String email, String name) {
        static Person of(User u) {
            return new Person(u.getId(), u.getEmail(), u.getName());
        }
    }

    public record SubmitResult(ApprovalDto approval, List<DeliveryDto> emails, boolean emailConfigured) {}

    /* ------------------------------------------------------------------ reading */

    @Transactional(readOnly = true)
    public ApprovalDto status(AuthUser user, Long projectId) {
        var grant = access.require(projectId, user, Access.VIEWER);
        return dto(grant.project(), grant.access(), user.id(), approvals.findFirstByProjectIdOrderByIdDesc(projectId).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> waitingForMe(AuthUser user) {
        List<Long> teamIds = new ArrayList<>();
        for (Team t : editorTeams(user.id())) teamIds.add(t.getId());
        if (teamIds.isEmpty()) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (DesignApproval a : approvals.waitingInTeams(teamIds)) {
            if (a.getRequestedBy().getId().equals(user.id())) continue;
            out.add(Map.of("projectId", a.getProject().getId(), "title", a.getProject().getTitle(), "requestedBy", a.getRequestedBy().getName(),
                    "requestedAt", a.getCreatedAt() == null ? Instant.now() : a.getCreatedAt(), "thumbnail", a.getProject().getThumbnail() == null ? "" : a.getProject().getThumbnail()));
        }
        return out;
    }

    /** Throws unless this person may publish the design right now (team designs only; personal designs are unrestricted). */
    @Transactional(readOnly = true)
    public void assertPublishable(AuthUser user, Long projectId) {
        Project p = projects.findById(projectId).orElseThrow(() -> ApiException.notFound("Design"));
        if (p.getTeam() == null) return;
        DesignApproval a = approvals.findFirstByProjectIdOrderByIdDesc(projectId).orElse(null);
        if (!"APPROVED".equals(effective(a, p))) throw ApiException.forbidden("This design needs approval from an Editor before it can be published.");
        if (!a.getRequestedBy().getId().equals(user.id()) && !isTeamEditor(p, user.id())) {
            throw ApiException.forbidden("Only the Maker who sent this design, or an Editor, can publish it.");
        }
    }

    /* ------------------------------------------------------------------ actions */

    public SubmitResult submit(AuthUser user, Long projectId, String message) {
        record Plan(Long approvalId, String title, String team, List<Person> recipients, String makerName) {}
        TransactionTemplate tx = new TransactionTemplate(tm);
        Plan plan = tx.execute(status -> {
            var grant = access.require(projectId, user, Access.MAKER);
            Project p = grant.project();
            if (p.getTeam() == null) throw ApiException.badRequest("Move this design into a team before sending it for approval.");
            List<User> reviewers = editorsOf(p.getTeam(), user.id());
            if (reviewers.isEmpty()) throw ApiException.badRequest("This team has no Editors who can approve yet. Ask the team owner to give someone the Editor role.");
            approvals.findByProjectIdAndStatus(projectId, Status.PENDING).forEach(old -> old.setStatus(Status.CANCELLED));
            DesignApproval a = new DesignApproval();
            a.setProject(p);
            a.setRequestedBy(userRef(user.id(), p));
            a.setMessage(message == null || message.isBlank() ? null : message.trim());
            approvals.save(a);
            activity.log(user.id(), projectId, "approval.requested", p.getTeam().getName());
            return new Plan(a.getId(), p.getTitle(), p.getTeam().getName(), reviewers.stream().map(Person::of).toList(), user.name());
        });

        String link = props.frontendUrl() + "/editor/" + projectId;
        List<Mail> mails = new ArrayList<>();
        for (Person r : plan.recipients()) {
            notifications.send(r.id(), "APPROVAL", user.name() + " sent \"" + plan.title() + "\" for your approval", "/editor/" + projectId);
            if (wantsEmail(r.id())) mails.add(MailTemplates.approvalNeeded(r.email(), r.name(), user.name(), plan.title(), plan.team(), message, link));
        }
        List<Delivery> deliveries = mail.sendAll(mails);
        broadcaster.event(projectId, "APPROVAL_CHANGED", null);
        return new SubmitResult(statusInTx(user, projectId), deliveries.stream().map(d -> new DeliveryDto(d.email(), d.name(), d.sent(), d.problem())).toList(), mail.configured());
    }

    public ApprovalDto approve(AuthUser user, Long approvalId, String caption) {
        return decide(user, approvalId, Status.APPROVED, caption, null);
    }

    public ApprovalDto requestChanges(AuthUser user, Long approvalId, String feedback) {
        if (feedback == null || feedback.isBlank()) throw ApiException.badRequest("Tell the Maker what to change.");
        return decide(user, approvalId, Status.CHANGES_REQUESTED, null, feedback.trim());
    }

    private ApprovalDto decide(AuthUser user, Long approvalId, Status outcome, String caption, String feedback) {
        record Done(Long projectId, String title, Person maker, String editorName) {}
        Done done = new TransactionTemplate(tm).execute(status -> {
            DesignApproval a = approvals.findById(approvalId).orElseThrow(() -> ApiException.notFound("Approval request"));
            Project p = a.getProject();
            access.require(p.getId(), user, Access.VIEWER);
            if (a.getStatus() != Status.PENDING) throw ApiException.conflict("This request has already been " + a.getStatus().name().toLowerCase().replace('_', ' ') + ".");
            if (!isTeamEditor(p, user.id())) throw ApiException.forbidden("Only an Editor of this team can review designs.");
            if (a.getRequestedBy().getId().equals(user.id())) throw ApiException.forbidden("You cannot approve your own request. Ask another Editor.");
            a.setStatus(outcome);
            a.setDecidedBy(userRef(user.id(), p));
            a.setDecidedAt(Instant.now());
            if (outcome == Status.APPROVED) {
                a.setApprovedRevision(projects.revisionOf(p.getId()));
                a.setCaption(caption == null || caption.isBlank() ? null : caption.trim());
            } else {
                a.setFeedback(feedback);
            }
            activity.log(user.id(), p.getId(), outcome == Status.APPROVED ? "approval.approved" : "approval.changes", feedback);
            return new Done(p.getId(), p.getTitle(), Person.of(a.getRequestedBy()), user.name());
        });

        String link = props.frontendUrl() + "/editor/" + done.projectId();
        String verb = outcome == Status.APPROVED ? "approved" : "asked for changes to";
        notifications.send(done.maker().id(), "APPROVAL", done.editorName() + " " + verb + " \"" + done.title() + "\"", "/editor/" + done.projectId());
        if (wantsEmail(done.maker().id())) {
            mail.send(outcome == Status.APPROVED
                    ? MailTemplates.approved(done.maker().email(), done.maker().name(), done.editorName(), done.title(), link)
                    : MailTemplates.changesRequested(done.maker().email(), done.maker().name(), done.editorName(), done.title(), feedback, link));
        }
        broadcaster.event(done.projectId(), "APPROVAL_CHANGED", null);
        return statusInTx(user, done.projectId());
    }

    /* ------------------------------------------------------------------ helpers */

    /** Calls from inside this class bypass the transactional proxy, so open the transaction explicitly. */
    private ApprovalDto statusInTx(AuthUser user, Long projectId) {
        return new TransactionTemplate(tm).execute(st -> status(user, projectId));
    }

    private ApprovalDto dto(Project p, Access myAccess, Long me, DesignApproval a) {
        Team team = p.getTeam();
        String status = effective(a, p);
        boolean editor = team != null && isTeamEditor(p, me);
        boolean pending = "PENDING".equals(status);
        boolean mine = a != null && a.getRequestedBy().getId().equals(me);
        List<String> reviewers = team == null ? List.of() : editorsOf(team, null).stream().map(User::getName).toList();
        return new ApprovalDto(team == null ? "NO_TEAM" : status, a == null ? null : a.getId(), team == null ? null : team.getId(), team == null ? null : team.getName(),
                a == null ? null : a.getRequestedBy().getId(), a == null ? null : a.getRequestedBy().getName(), a == null ? null : a.getMessage(),
                a == null ? null : a.getFeedback(), a == null ? null : a.getCaption(), a == null || a.getDecidedBy() == null ? null : a.getDecidedBy().getName(),
                a == null ? null : a.getDecidedAt(), a == null ? null : a.getCreatedAt(),
                team != null && myAccess.atLeast(Access.MAKER) && !pending,
                pending && editor && !mine,
                "APPROVED".equals(status) && (mine || editor),
                reviewers);
    }

    private String effective(DesignApproval a, Project p) {
        if (a == null) return "NONE";
        if (a.getStatus() == Status.CANCELLED) return "NONE";
        if (a.getStatus() == Status.APPROVED && !Objects.equals(a.getApprovedRevision(), projects.revisionOf(p.getId()))) return "EXPIRED";
        return a.getStatus().name();
    }

    private boolean isTeamEditor(Project p, Long userId) {
        Team t = p.getTeam();
        if (t == null) return false;
        if (t.getOwner().getId().equals(userId)) return true;
        return teamMembers.findByTeamIdAndUserId(t.getId(), userId).map(m -> m.getRole() == Access.EDITOR).orElse(false);
    }

    /** The team owner plus every member with the Editor role, optionally leaving one person out. */
    private List<User> editorsOf(Team team, Long except) {
        Map<Long, User> out = new LinkedHashMap<>();
        out.put(team.getOwner().getId(), team.getOwner());
        for (TeamMember m : teamMembers.findByTeamId(team.getId())) if (m.getRole() == Access.EDITOR) out.putIfAbsent(m.getUser().getId(), m.getUser());
        if (except != null) out.remove(except);
        return new ArrayList<>(out.values());
    }

    private List<Team> editorTeams(Long userId) {
        List<Team> out = new ArrayList<>();
        for (TeamMember m : teamMembers.findByUserId(userId)) if (m.getRole() == Access.EDITOR) out.add(m.getTeam());
        out.addAll(teamMembers.ownedTeams(userId));
        return out;
    }

    private boolean wantsEmail(Long userId) {
        return emailSettings.findByUserId(userId).map(EmailSetting::isApprovals).orElse(true);
    }

    private User userRef(Long id, Project p) {
        return users.getReferenceById(id);
    }
}
