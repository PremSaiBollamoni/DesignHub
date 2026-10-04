package com.designhub.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public final class DesignDtos {
    private DesignDtos() {}

    public record ElementDto(String id, String type, int zIndex, JsonNode data) {}

    public record PageDto(String id, String name, String background, Double durationSeconds, int position,
                          List<ElementDto> elements, String notes) {}

    public record DesignDto(Long projectId, long revision, int width, int height, List<PageDto> pages) {}

    public record CursorDto(double x, double y, String pageId) {}

    /**
     * One collaboration/persistence operation. Only the fields relevant to {@code type} are populated:
     * ELEMENTS_UPSERT(pageId, elements), ELEMENTS_DELETE(ids), PAGE_UPSERT(page), PAGE_DELETE(pageId),
     * PAGES_ORDER(order), PROJECT_SIZE(width,height), CURSOR(cursor), CHAT(text), SELECTION(ids, pageId).
     */
    public record DesignOp(String type, String clientId, String pageId, List<ElementDto> elements, List<String> ids,
                           PageDto page, List<String> order, CursorDto cursor, String text, Integer width,
                           Integer height) {}

    /** Server-to-client envelope: the op plus who sent it. */
    public record OpEnvelope(DesignOp op, Long userId, String userName, long revision) {}

    public record PresenceDto(String sessionId, Long userId, String name, String avatarUrl, String color) {}
}
