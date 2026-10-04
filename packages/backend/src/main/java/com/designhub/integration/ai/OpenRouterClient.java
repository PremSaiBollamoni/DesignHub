package com.designhub.integration.ai;

import com.designhub.exception.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** OpenRouter exposes hundreds of models behind one OpenAI-style endpoint; the person picks the model by name. */
@Slf4j
@Component
public class OpenRouterClient implements AiClient {
    private static final String DEFAULT_BASE = "https://openrouter.ai/api/v1";
    private final RestClient http = RestClient.create();

    @Override public String id() { return "openrouter"; }
    @Override public String defaultTextModel() { return "openai/gpt-4o-mini"; }
    @Override public String defaultImageModel() { return ""; }
    @Override public boolean supportsImages() { return false; }

    @Override
    public String text(AiCredentials c, String system, String prompt) {
        String base = ProviderErrors.apiBase(c.baseUrl(), DEFAULT_BASE);
        Map<String, Object> body = Map.of("model", c.textModel(), "messages", List.of(
                Map.of("role", "system", "content", system), Map.of("role", "user", "content", prompt)));
        try {
            JsonNode res = http.post().uri(base + "/chat/completions").contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + c.apiKey())
                    .header("HTTP-Referer", "https://designhub.local")
                    .header("X-Title", "DesignHub")
                    .body(body).retrieve().body(JsonNode.class);
            if (res != null && res.has("error")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "OpenRouter says: " + res.path("error").path("message").asText("the request failed"));
            }
            String out = res == null ? "" : res.path("choices").path(0).path("message").path("content").asText("");
            if (out.isBlank()) throw new ApiException(HttpStatus.BAD_GATEWAY, "OpenRouter returned an empty reply. Try a different model.");
            return out;
        } catch (org.springframework.web.client.ResourceAccessException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OpenRouter could not be reached from the server.");
        } catch (org.springframework.web.client.UnknownContentTypeException e) {
            throw ProviderErrors.notAnAiService(base);
        } catch (RestClientResponseException e) {
            log.warn("OpenRouter error {}", e.getStatusCode().value());
            int code = e.getStatusCode().value();
            if (code == 401 || code == 403) throw new ApiException(HttpStatus.BAD_REQUEST, "OpenRouter rejected your API key.");
            if (code == 402) throw new ApiException(HttpStatus.BAD_REQUEST, "OpenRouter says this key has no credit for that model.");
            if (code == 404 || code == 400) throw new ApiException(HttpStatus.BAD_REQUEST, "OpenRouter does not accept that model name. Copy it exactly from openrouter.ai/models.");
            if (code == 429) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OpenRouter is rate limiting this key. Try again shortly.");
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OpenRouter returned an error (" + code + ").");
        }
    }

    @Override
    public GeneratedImage image(AiCredentials c, String prompt, int width, int height) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "OpenRouter is used for text and layouts here. Connect OpenAI or Google for image generation.");
    }
}
