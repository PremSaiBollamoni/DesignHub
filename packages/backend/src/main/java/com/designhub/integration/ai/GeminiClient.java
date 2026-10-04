package com.designhub.integration.ai;

import com.designhub.exception.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Component
public class GeminiClient implements AiClient {
    private static final String DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";
    private final RestClient http = RestClient.create();

    @Override public String id() { return "google"; }
    @Override public String defaultTextModel() { return "gemini-2.5-flash"; }
    @Override public String defaultImageModel() { return "gemini-2.5-flash-image"; }
    @Override public boolean supportsImages() { return true; }

    @Override
    public String text(AiCredentials c, String system, String prompt) {
        Map<String, Object> body = Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text", system))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))));
        JsonNode res = call(c, c.textModel(), body);
        StringBuilder sb = new StringBuilder();
        res.path("candidates").path(0).path("content").path("parts").forEach(p -> sb.append(p.path("text").asText("")));
        return sb.toString();
    }

    @Override
    public GeneratedImage image(AiCredentials c, String prompt, int width, int height) {
        Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("responseModalities", List.of("IMAGE", "TEXT")));
        JsonNode res = call(c, c.imageModel(), body);
        for (JsonNode part : res.path("candidates").path(0).path("content").path("parts")) {
            JsonNode inline = part.has("inlineData") ? part.get("inlineData") : part.path("inline_data");
            if (inline.hasNonNull("data")) {
                return new GeneratedImage(Base64.getDecoder().decode(inline.get("data").asText()), inline.path("mimeType").asText("image/png"));
            }
        }
        throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI provider returned no image");
    }

    private JsonNode call(AiCredentials c, String model, Object body) {
        String base = c.baseUrl() == null || c.baseUrl().isBlank() ? DEFAULT_BASE : c.baseUrl().replaceAll("/+$", "");
        try {
            return http.post().uri(base + "/models/" + model + ":generateContent").contentType(MediaType.APPLICATION_JSON)
                    .header("x-goog-api-key", c.apiKey()).body(body).retrieve().body(JsonNode.class);
        } catch (org.springframework.web.client.UnknownContentTypeException e) {
            throw ProviderErrors.notAnAiService(null);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI provider could not be reached from the server.");
        } catch (RestClientResponseException e) {
            log.warn("Gemini error {}", e.getStatusCode().value());
            throw ProviderErrors.from(e);
        }
    }
}
