package com.designhub.config;

import com.designhub.dto.DesignDtos.DesignDto;
import com.designhub.dto.DesignDtos.ElementDto;
import com.designhub.dto.DesignDtos.PageDto;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.springframework.stereotype.Component;

/** Renders a light SVG preview (shapes and text) of a design's first page for template galleries. */
@Component
public class TemplateThumbnailer {

    public String svg(DesignDto design) {
        PageDto page = design.pages().get(0);
        StringBuilder sb = new StringBuilder();
        sb.append("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ").append(design.width()).append(' ').append(design.height()).append("'>");
        sb.append("<rect width='100%' height='100%' fill='").append(esc(page.background() == null ? "#fff" : page.background())).append("'/>");
        sb.append("<g>");
        for (ElementDto e : page.elements()) {
            JsonNode d = e.data();
            double x = d.path("x").asDouble(), y = d.path("y").asDouble(), w = d.path("width").asDouble(), h = d.path("height").asDouble();
            if ("shape".equals(e.type())) {
                String fill = esc(d.path("fill").asText("#000"));
                if ("ellipse".equals(d.path("shape").asText())) {
                    sb.append("<ellipse cx='").append(x + w / 2).append("' cy='").append(y + h / 2).append("' rx='").append(w / 2).append("' ry='").append(h / 2)
                            .append("' fill='").append(fill).append("'/>");
                } else {
                    sb.append("<rect x='").append(x).append("' y='").append(y).append("' width='").append(w).append("' height='").append(h)
                            .append("' rx='").append(d.path("cornerRadius").asDouble()).append("' fill='").append(fill).append("'/>");
                }
            } else if ("text".equals(e.type())) {
                double size = d.path("fontSize").asDouble(48);
                String all = d.path("text").asText();
                double maxChars = Math.max(4, w / (size * 0.54));
                StringBuilder line = new StringBuilder();
                java.util.List<String> lines = new java.util.ArrayList<>();
                for (String word : all.split(" ")) {
                    if (line.length() > 0 && line.length() + word.length() + 1 > maxChars) {
                        lines.add(line.toString());
                        line.setLength(0);
                    }
                    line.append(line.length() == 0 ? "" : " ").append(word);
                }
                if (line.length() > 0) lines.add(line.toString());
                sb.append("<text font-size='").append(size).append("' font-weight='").append(d.path("fontWeight").asInt(400)).append("' fill='")
                        .append(esc(d.path("fill").asText("#000"))).append("' font-family='").append(esc(d.path("fontFamily").asText("sans-serif"))).append(", sans-serif'>");
                for (int i = 0; i < lines.size(); i++) {
                    sb.append("<tspan x='").append(x).append("' y='").append(y + size * (1.0 + 1.1 * i)).append("'>").append(esc(lines.get(i))).append("</tspan>");
                }
                sb.append("</text>");
            }
        }
        sb.append("</g></svg>");
        return "data:image/svg+xml;base64," + Base64.getEncoder().encodeToString(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String esc(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("'", "&apos;");
    }
}
