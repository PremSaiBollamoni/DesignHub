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

@Slf4j
@Component
public class AnthropicClient implements AiClient {
    private static final String DEFAULT_BASE = "https://api.anthropic.com/v1";
    private final RestClient http = RestClient.create();

    @Override public String id() { return "anthropic"; }
    @Override public String defaultTextModel() { return "claude-sonnet-5-5"; }
    @Override public String defaultImageModel() { return ""; }
    @Override public boolean supportsImages() { return false; }

    @Override
    public String text(AiCredentials c, String system, String prompt) {
        String base = c.baseUrl() == null || c.baseUrl().isBlank() ? DEFAULT_BASE : c.baseUrl().replaceAll("/+$", "");
        Map<String, Object> body = Map.of("model", c.textModel(), "max_tokens", 4096, "system", system,
                "messages", List.of(Map.of("role", "user", "content", prompt)));
        try {
            JsonNode res = http.post().uri(base + "/messages").contentType(MediaType.APPLICATION_JSON)
                    .header("x-api-key", c.apiKey()).header("anthropic-version", "2023-06-01").body(body).retrieve().body(JsonNode.class);
            StringBuilder sb = new StringBuilder();
            res.path("content").forEach(block -> sb.append(block.path("text").asText("")));
            return sb.toString();
        } catch (org.springframework.web.client.UnknownContentTypeException e) {
            throw ProviderErrors.notAnAiService(null);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The AI provider could not be reached from the server.");
        } catch (RestClientResponseException e) {
            log.warn("Anthropic error {}", e.getStatusCode().value());
            throw ProviderErrors.from(e);
        }
    }

    @Override
    public GeneratedImage image(AiCredentials c, String prompt, int width, int height) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Anthropic does not generate images. Choose OpenAI or Google for image generation.");
    }
}
