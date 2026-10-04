package com.designhub.ws;

import com.designhub.domain.Access;
import com.designhub.domain.User;
import com.designhub.dto.DesignDtos.DesignOp;
import com.designhub.dto.DesignDtos.OpEnvelope;
import com.designhub.exception.ApiException;
import com.designhub.repository.ProjectRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.designhub.service.AccessService;
import com.designhub.service.DesignService;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Applies a client operation (permission check, persistence) then fans it out to the project room. */
@Slf4j
@Service
@RequiredArgsConstructor
public class CollaborationService {
    private static final Set<String> PERSISTED = Set.of("ELEMENTS_UPSERT", "ELEMENTS_DELETE", "PAGE_UPSERT", "PAGE_DELETE", "PAGES_ORDER", "PROJECT_SIZE");
    private static final Set<String> EPHEMERAL = Set.of("CURSOR", "SELECTION", "PAGE_FOCUS");

    private final AccessService access;
    private final DesignService design;
    private final ProjectRepository projects;
    private final UserRepository users;
    private final PresenceRegistry presence;
    private final ProjectBroadcaster broadcaster;

    public void join(String sessionId, Long projectId, AuthUser user) {
        Access level = access.require(projectId, user, Access.VIEWER).access();
        String avatar = users.findById(user.id()).map(User::getAvatarUrl).orElse(null);
        presence.join(sessionId, projectId, level, user, avatar);
    }

    public void handle(String sessionId, Long projectId, AuthUser user, DesignOp op) {
        var joined = presence.get(sessionId, projectId).orElseThrow(() -> ApiException.forbidden("Join the design before sending changes"));
        long revision = -1;
        if (PERSISTED.contains(op.type())) {
            if (!joined.access().atLeast(Access.MAKER)) throw ApiException.forbidden("You have view-only access to this design");
            revision = design.apply(projects.getReferenceById(projectId), op);
        } else if ("CHAT".equals(op.type())) {
            if (!joined.access().atLeast(Access.COMMENTER)) throw ApiException.forbidden("You cannot chat on this design");
        } else if (!EPHEMERAL.contains(op.type())) {
            throw ApiException.badRequest("Unknown operation " + op.type());
        }
        broadcaster.op(projectId, new OpEnvelope(op, user.id(), user.name(), revision));
    }
}
