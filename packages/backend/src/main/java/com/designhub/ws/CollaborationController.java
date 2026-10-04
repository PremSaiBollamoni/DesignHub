package com.designhub.ws;

import com.designhub.dto.DesignDtos.DesignOp;
import com.designhub.security.AuthUser;
import java.security.Principal;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
public class CollaborationController {
    private final CollaborationService collaboration;
    private final PresenceRegistry presence;

    @MessageMapping("/project/{id}/join")
    public void join(@DestinationVariable Long id, Principal principal, @Header("simpSessionId") String sessionId) {
        collaboration.join(sessionId, id, user(principal));
    }

    @MessageMapping("/project/{id}/leave")
    public void leave(@Header("simpSessionId") String sessionId) {
        presence.leave(sessionId);
    }

    @MessageMapping("/project/{id}/ops")
    public void ops(@DestinationVariable Long id, DesignOp op, Principal principal, @Header("simpSessionId") String sessionId) {
        collaboration.handle(sessionId, id, user(principal), op);
    }

    @MessageExceptionHandler
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public Map<String, String> onError(Exception e) {
        log.debug("Collaboration message rejected: {}", e.getMessage());
        return Map.of("message", e.getMessage() == null ? "Message rejected" : e.getMessage());
    }

    private AuthUser user(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken t && t.getPrincipal() instanceof AuthUser u) return u;
        if (principal instanceof AuthUser u) return u;
        throw new IllegalStateException("Not authenticated");
    }
}
