package com.designhub.integration.ai;

import com.designhub.exception.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Works with OpenAI and any provider exposing the same REST shape (OpenRouter, Together, local gateways). */
@Slf4j
@Component
public class OpenAiCompatibleClient implements AiClient {
    private static final String DEFAULT_BASE = "https://api.openai.com/v1";
    private final RestClient http = RestClient.create();

    @Override public String id() { return "openai"; }
    @Override public String defaultTextModel() { return "gpt-4o-mini"; }
    @Override public String defaultImageModel() { return "gpt-image-1"; }
    @Override public boolean supportsImages() { return true; }

    @Override
    public String text(AiCredentials c, String system, String prompt) {
        Map<String, Object> body = Map.of("model", c.textModel(), "messages", List.of(
                Map.of("role", "system", "content", system), Map.of("role", "user", "content", prompt)));
        JsonNode res = post(c, "/chat/completions", body);
        return res.path("choices").path(0).path("message").path("content").asText("");
    }

    @Override
    public GeneratedImage image(AiCredentials c, String prompt, int width, int height) {
        String size = width > height * 1.2 ? "1536x1024" : height > width * 1.2 ? "1024x1536" : "1024x1024";
        JsonNode res = post(c, "/images/generations", Map.of("model", c.imageModel(), "prompt", prompt, "size", size, "n", 1));
        JsonNode item = res.path("data").path(0);
        if (item.hasNonNull("b64_json")) return new GeneratedImage(Base64.getDecoder().decode(item.get("b64_json").asText()), "image/png");
        if (item.hasNonNull("url")) {
            byte[] bytes = http.get().uri(URI.create(item.get("url").asText())).retrieve().body(byte[].class);
            return new GeneratedImage(bytes, "image/png");
        }
        throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI provider returned no image");
    }

    private JsonNode post(AiCredentials c, String path, Object body) {
        String base = ProviderErrors.apiBase(c.baseUrl(), DEFAULT_BASE);
        try {
            return http.post().uri(base + path).contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + c.apiKey()).body(body).retrieve().body(JsonNode.class);
        } catch (RestClientResponseException e) {
            log.warn("AI provider error {} on {}", e.getStatusCode().value(), path);
            throw ProviderErrors.from(e);
        } catch (org.springframework.web.client.RestClientException e) {
            log.warn("AI provider at {} gave an unreadable reply: {}", base, e.getClass().getSimpleName());
            throw ProviderErrors.notAnAiService(base);
        }
    }
}
