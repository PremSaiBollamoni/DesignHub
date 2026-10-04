package com.designhub.ws;

import com.designhub.dto.DesignDtos.DesignOp;
import com.designhub.dto.DesignDtos.OpEnvelope;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/** Single place that knows STOMP destination names for project rooms. */
@Component
@RequiredArgsConstructor
public class ProjectBroadcaster {
    private final SimpMessagingTemplate messaging;

    public static String topic(Long projectId) {
        return "/topic/project." + projectId;
    }

    public static String presenceTopic(Long projectId) {
        return "/topic/project." + projectId + ".presence";
    }

    public void op(Long projectId, OpEnvelope envelope) {
        messaging.convertAndSend(topic(projectId), envelope);
    }

    /** Tells every open editor to reload the document (used after a version restore). */
    public void reload(Long projectId, Long userId, String userName, long revision) {
        DesignOp op = new DesignOp("RELOAD", null, null, null, null, null, null, null, null, null, null);
        op(projectId, new OpEnvelope(op, userId, userName, revision));
    }

    public void event(Long projectId, String type, Object payload) {
        messaging.convertAndSend("/topic/project." + projectId + ".events", new Event(type, payload));
    }

    public record Event(String type, Object payload) {}
}
