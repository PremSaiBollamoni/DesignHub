package com.designhub.ws;

import com.designhub.domain.Access;
import com.designhub.dto.DesignDtos.PresenceDto;
import com.designhub.security.AuthUser;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/** In-memory room membership. Access is resolved once at join and cached for the lifetime of the session. */
@Component
@RequiredArgsConstructor
public class PresenceRegistry {
    private static final String[] COLORS = {"#FF5A36", "#FFB547", "#0FA37F", "#B833E0", "#E0A100", "#0B8FD6", "#D6336C", "#5C7C1B"};

    public record Joined(Long projectId, Access access, AuthUser user, PresenceDto presence) {}

    private final Map<String, Joined> bySession = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate messaging;

    public Joined join(String sessionId, Long projectId, Access access, AuthUser user, String avatarUrl) {
        PresenceDto dto = new PresenceDto(sessionId, user.id(), user.name(), avatarUrl, COLORS[(int) (user.id() % COLORS.length)]);
        Joined joined = new Joined(projectId, access, user, dto);
        Joined previous = bySession.put(sessionId, joined);
        if (previous != null && !previous.projectId().equals(projectId)) broadcast(previous.projectId());
        broadcast(projectId);
        return joined;
    }

    public Optional<Joined> get(String sessionId, Long projectId) {
        return Optional.ofNullable(bySession.get(sessionId)).filter(j -> j.projectId().equals(projectId));
    }

    public void leave(String sessionId) {
        Joined removed = bySession.remove(sessionId);
        if (removed != null) broadcast(removed.projectId());
    }

    @EventListener
    void onDisconnect(SessionDisconnectEvent event) {
        leave(event.getSessionId());
    }

    private void broadcast(Long projectId) {
        List<PresenceDto> list = new ArrayList<>();
        bySession.values().stream().filter(j -> j.projectId().equals(projectId)).forEach(j -> list.add(j.presence()));
        messaging.convertAndSend(ProjectBroadcaster.presenceTopic(projectId), list);
    }
}
