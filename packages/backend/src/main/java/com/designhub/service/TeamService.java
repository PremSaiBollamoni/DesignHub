package com.designhub.service;

import com.designhub.domain.Access;
import com.designhub.domain.Team;
import com.designhub.domain.TeamMember;
import com.designhub.domain.User;
import com.designhub.exception.ApiException;
import com.designhub.repository.TeamMemberRepository;
import com.designhub.repository.TeamRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeamService {
    private final TeamRepository teams;
    private final TeamMemberRepository members;
    private final UserRepository users;
    private final SubscriptionService subscriptions;
    private final NotificationService notifications;

    public record TeamDto(Long id, String name, Long ownerId, int memberCount, String myRole) {}

    public record MemberDto(Long userId, String name, String email, String avatarUrl, String role) {}

    @Transactional(readOnly = true)
    public List<TeamDto> list(AuthUser user) {
        return teams.findForUser(user.id()).stream().map(t -> dto(t, user.id())).toList();
    }

    @Transactional
    public TeamDto create(AuthUser user, String name) {
        Team t = new Team();
        t.setName(name.trim());
        t.setOwner(users.getReferenceById(user.id()));
        teams.save(t);
        return dto(t, user.id());
    }

    @Transactional
    public void delete(AuthUser user, Long teamId) {
        Team t = owned(user, teamId);
        members.deleteAll(members.findByTeamId(teamId));
        teams.delete(t);
    }

    @Transactional(readOnly = true)
    public List<MemberDto> members(AuthUser user, Long teamId) {
        Team t = visible(user, teamId);
        List<MemberDto> out = new ArrayList<>();
        User o = t.getOwner();
        out.add(new MemberDto(o.getId(), o.getName(), o.getEmail(), o.getAvatarUrl(), Access.OWNER.name()));
        members.findByTeamId(teamId).forEach(m -> out.add(new MemberDto(m.getUser().getId(), m.getUser().getName(),
                m.getUser().getEmail(), m.getUser().getAvatarUrl(), m.getRole().name())));
        return out;
    }

    @Transactional
    public MemberDto addMember(AuthUser user, Long teamId, String email, Access role) {
        Team t = owned(user, teamId);
        if (role == Access.OWNER) throw ApiException.badRequest("Choose viewer, commenter or editor");
        int seats = subscriptions.planFor(user.id()).getTeamSeats();
        if (members.findByTeamId(teamId).size() + 1 >= seats) {
            throw ApiException.limit("Your plan includes " + seats + " team seat" + (seats == 1 ? "" : "s") + ". Upgrade to add more people.");
        }
        User invitee = users.findByEmailIgnoreCase(email.trim()).orElseThrow(() -> ApiException.notFound("A DesignHub account for " + email.trim()));
        TeamMember m = members.findByTeamIdAndUserId(teamId, invitee.getId()).orElseGet(TeamMember::new);
        boolean isNew = m.getId() == null;
        m.setTeam(t);
        m.setUser(invitee);
        m.setRole(role);
        members.save(m);
        if (isNew) notifications.send(invitee.getId(), "INVITATION", user.name() + " added you to the team \"" + t.getName() + "\"", "/");
        return new MemberDto(invitee.getId(), invitee.getName(), invitee.getEmail(), invitee.getAvatarUrl(), role.name());
    }

    @Transactional
    public void removeMember(AuthUser user, Long teamId, Long userId) {
        Team t = teams.findById(teamId).orElseThrow(() -> ApiException.notFound("Team"));
        if (!userId.equals(user.id()) && !t.getOwner().getId().equals(user.id())) throw ApiException.forbidden("Only the team owner can remove members");
        members.findByTeamIdAndUserId(teamId, userId).ifPresent(members::delete);
    }

    private Team owned(AuthUser user, Long teamId) {
        Team t = teams.findById(teamId).orElseThrow(() -> ApiException.notFound("Team"));
        if (!t.getOwner().getId().equals(user.id())) throw ApiException.forbidden("Only the team owner can do that");
        return t;
    }

    private Team visible(AuthUser user, Long teamId) {
        Team t = teams.findById(teamId).orElseThrow(() -> ApiException.notFound("Team"));
        if (!t.getOwner().getId().equals(user.id()) && members.findByTeamIdAndUserId(teamId, user.id()).isEmpty()) throw ApiException.notFound("Team");
        return t;
    }

    private TeamDto dto(Team t, Long uid) {
        String role = t.getOwner().getId().equals(uid) ? "OWNER" : members.findByTeamIdAndUserId(t.getId(), uid).map(m -> m.getRole().name()).orElse("VIEWER");
        return new TeamDto(t.getId(), t.getName(), t.getOwner().getId(), members.findByTeamId(t.getId()).size() + 1, role);
    }
}
