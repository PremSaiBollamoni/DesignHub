package com.designhub.service;

import com.designhub.domain.AIUsage;
import com.designhub.dto.DesignDtos.ElementDto;
import com.designhub.exception.ApiException;
import com.designhub.repository.AIUsageRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.designhub.service.AiSettingService.Resolved;
import com.designhub.service.StorageService.AssetDto;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {
    private static final Set<String> SHAPES = Set.of("rect", "ellipse", "triangle", "star", "line", "arrow", "polygon");

    private static final String DESIGN_SYSTEM_PROMPT = """
            You are a senior graphic designer laying out one page of a design. Reply with JSON only, no prose, in this shape:
            {"background":"#RRGGBB","elements":[{"type":"text","text":"...","x":0,"y":0,"width":0,"fontSize":0,"fontFamily":"Inter","fontWeight":700,"fill":"#RRGGBB","align":"left"},
            {"type":"shape","shape":"rect|ellipse|triangle|star|line","x":0,"y":0,"width":0,"height":0,"fill":"#RRGGBB","cornerRadius":0}]}
            Rules: stay inside the canvas, keep at least 5% margins, use at most 8 elements, give text a strong size hierarchy,
            ensure text contrast against the background, and write real, specific copy for the brief rather than placeholders.
            """;

    private final AiSettingService settings;
    private final SubscriptionService subscriptions;
    private final AIUsageRepository usage;
    private final UserRepository users;
    private final StorageService storage;
    private final ObjectMapper mapper;

    public record AiDesign(String background, List<ElementDto> elements) {}

    public String text(AuthUser user, String system, String prompt) {
        subscriptions.checkAiQuota(user.id());
        Resolved r = settings.resolve(user, false);
        return tracked(user, r, "text", prompt.length(), () -> clean(r.client().text(r.creds(), system, prompt)), String::length);
    }

    public AssetDto image(AuthUser user, String prompt, int width, int height) {
        subscriptions.checkAiQuota(user.id());
        Resolved r = settings.resolve(user, true);
        var img = tracked(user, r, "image", prompt.length(), () -> r.client().image(r.creds(), prompt, width, height), i -> i.bytes().length);
        return storage.storeBytes(user, img.bytes(), img.mime(), "ai-image." + (img.mime().contains("jpeg") ? "jpg" : "png"), "image");
    }

    public AiDesign design(AuthUser user, String brief, int width, int height, String brandHint) {
        String prompt = "Canvas: " + width + "x" + height + " px.\nBrief: " + brief + (brandHint == null ? "" : "\nBrand: " + brandHint);
        String raw = text(user, DESIGN_SYSTEM_PROMPT, prompt);
        try {
            JsonNode root = mapper.readTree(stripFences(raw));
            return new AiDesign(color(root.path("background").asText("#ffffff"), "#ffffff"), sanitize(root.path("elements"), width, height));
        } catch (JsonProcessingException e) {
            log.warn("AI design reply was not valid JSON");
            throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "The AI reply could not be turned into a layout. Try rephrasing your brief.");
        }
    }

    /** The model's JSON is untrusted: whitelist types, clamp geometry, and assign our own ids. */
    private List<ElementDto> sanitize(JsonNode nodes, int w, int h) {
        List<ElementDto> out = new ArrayList<>();
        int z = 0;
        for (JsonNode n : nodes) {
            if (out.size() >= 12) break;
            ObjectNode d = mapper.createObjectNode();
            String type = n.path("type").asText();
            double x = clamp(n.path("x").asDouble(0), 0, w), y = clamp(n.path("y").asDouble(0), 0, h);
            d.put("x", x).put("y", y).put("rotation", 0).put("opacity", 1);
            if ("text".equals(type)) {
                d.put("width", clamp(n.path("width").asDouble(w * 0.6), 20, w - x));
                d.put("text", truncate(n.path("text").asText(""), 400));
                d.put("fontSize", clamp(n.path("fontSize").asDouble(48), 8, 400));
                d.put("fontFamily", truncate(n.path("fontFamily").asText("Inter"), 60));
                d.put("fontWeight", clamp(n.path("fontWeight").asDouble(400), 100, 900));
                d.put("fill", color(n.path("fill").asText(), "#151515"));
                d.put("align", Set.of("left", "center", "right").contains(n.path("align").asText()) ? n.path("align").asText() : "left");
                out.add(new ElementDto(UUID.randomUUID().toString(), "text", z++, d));
            } else if ("shape".equals(type) && SHAPES.contains(n.path("shape").asText())) {
                d.put("shape", n.path("shape").asText());
                d.put("width", clamp(n.path("width").asDouble(200), 1, w));
                d.put("height", clamp(n.path("height").asDouble(200), 1, h));
                d.put("fill", color(n.path("fill").asText(), "#FF5A36"));
                d.put("cornerRadius", clamp(n.path("cornerRadius").asDouble(0), 0, 2000));
                d.put("strokeWidth", 0);
                out.add(new ElementDto(UUID.randomUUID().toString(), "shape", z++, d));
            }
        }
        return out;
    }

    private <T> T tracked(AuthUser user, Resolved r, String kind, int promptChars, Supplier<T> call, java.util.function.ToIntFunction<T> size) {
        long start = System.currentTimeMillis();
        try {
            T result = call.get();
            record(user.id(), r.client().id(), kind, kind.equals("image") ? r.creds().imageModel() : r.creds().textModel(), promptChars, size.applyAsInt(result), true, start);
            return result;
        } catch (RuntimeException e) {
            record(user.id(), r.client().id(), kind, null, promptChars, 0, false, start);
            throw e;
        }
    }

    /** The repository save commits on its own, so a failed provider call is still counted. */
    private void record(Long userId, String provider, String kind, String model, int promptChars, int outChars, boolean ok, long start) {
        AIUsage u = new AIUsage();
        u.setUser(users.getReferenceById(userId));
        u.setProvider(provider);
        u.setKind(kind);
        u.setModel(model);
        u.setPromptChars(promptChars);
        u.setOutputChars(outChars);
        u.setSuccess(ok);
        u.setLatencyMs(System.currentTimeMillis() - start);
        usage.save(u);
    }

    /** Reasoning models may prepend their thinking in <think> tags; that is never part of the answer. */
    private static String clean(String reply) {
        return reply.replaceAll("(?s)<think>.*?</think>", "").replaceAll("(?s)^.*</think>", "").trim();
    }

    private static String stripFences(String s) {
        String t = s.trim();
        if (t.startsWith("```")) {
            t = t.replaceFirst("^```[a-zA-Z]*\\s*", "").replaceFirst("\\s*```$", "");
        }
        int a = t.indexOf('{'), b = t.lastIndexOf('}');
        return a >= 0 && b > a ? t.substring(a, b + 1) : t;
    }

    private static double clamp(double v, double lo, double hi) {
        return Double.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v));
    }

    private static String color(String v, String fallback) {
        return v != null && v.matches("^#[0-9a-fA-F]{6}$") ? v : fallback;
    }

    private static String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
