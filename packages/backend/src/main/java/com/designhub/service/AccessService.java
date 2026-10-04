package com.designhub.service;

import com.designhub.domain.Access;
import com.designhub.domain.Collaborator;
import com.designhub.domain.Project;
import com.designhub.domain.TeamMember;
import com.designhub.exception.ApiException;
import com.designhub.repository.CollaboratorRepository;
import com.designhub.repository.ProjectRepository;
import com.designhub.repository.TeamMemberRepository;
import com.designhub.security.AuthUser;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The only place that decides who may do what to a project. Never trust the client for this. */
@Service
@RequiredArgsConstructor
public class AccessService {
    private final ProjectRepository projects;
    private final CollaboratorRepository collaborators;
    private final TeamMemberRepository teamMembers;

    public record Grant(Project project, Access access) {}

    @Transactional(readOnly = true)
    public Optional<Access> resolve(Project p, Long userId) {
        if (p.getOwner().getId().equals(userId)) return Optional.of(Access.OWNER);
        Access best = collaborators.findByProjectIdAndUserId(p.getId(), userId).map(Collaborator::getRole).orElse(null);
        if (p.getTeam() != null) {
            Access team = teamMembers.findByTeamIdAndUserId(p.getTeam().getId(), userId).map(TeamMember::getRole).orElse(null);
            if (team != null && (best == null || team.ordinal() > best.ordinal())) best = team;
            if (team == null && p.getTeam().getOwner().getId().equals(userId)) best = Access.EDITOR;
        }
        return Optional.ofNullable(best);
    }

    /** Loads the project and verifies the caller holds at least {@code min}. */
    @Transactional(readOnly = true)
    public Grant require(Long projectId, AuthUser user, Access min) {
        Project p = projects.findById(projectId).orElseThrow(() -> ApiException.notFound("Design"));
        Access access = resolve(p, user.id()).orElseThrow(() -> ApiException.notFound("Design"));
        if (p.getDeletedAt() != null && access != Access.OWNER) throw ApiException.notFound("Design");
        if (!access.atLeast(min)) throw ApiException.forbidden("You need " + min.name().toLowerCase() + " access to do that");
        return new Grant(p, access);
    }
}
