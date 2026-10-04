package com.designhub.integration.ai;

import com.designhub.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientResponseException;

final class ProviderErrors {
    private ProviderErrors() {}

    /** Turns a typed base URL into the API root, fixing the common mistake of pasting a provider's website address. */
    static String apiBase(String typed, String fallback) {
        if (typed == null || typed.isBlank()) return fallback;
        String t = typed.trim().replaceAll("/+$", "");
        try {
            java.net.URI u = java.net.URI.create(t);
            String host = u.getHost() == null ? "" : u.getHost().toLowerCase();
            String path = u.getPath() == null ? "" : u.getPath();
            if (host.equals("openrouter.ai") || host.endsWith(".openrouter.ai")) {
                return path.isEmpty() || path.equals("/api") ? "https://openrouter.ai/api/v1" : t;
            }
        } catch (IllegalArgumentException e) {
            return t;
        }
        return t;
    }

    /** The address answered, but not like an AI service (a web page, an empty body, something else). */
    static ApiException notAnAiService(String base) {
        return new ApiException(HttpStatus.BAD_REQUEST, "That address did not answer like an AI service. Check the base URL"
                + (base != null && base.contains("openrouter") ? ": for OpenRouter it is https://openrouter.ai/api/v1" : "."));
    }

    /** Translates provider failures into messages the user can act on, without echoing provider payloads (which can contain keys). */
    static ApiException from(RestClientResponseException e) {
        int code = e.getStatusCode().value();
        if (code == 401 || code == 403) return new ApiException(HttpStatus.BAD_REQUEST, "The AI provider rejected your API key. Check it in AI settings.");
        if (code == 429) return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "The AI provider is rate limiting your key. Try again shortly.");
        if (code == 404) return new ApiException(HttpStatus.BAD_REQUEST, "The AI provider does not know that model. Check the model name in AI settings.");
        return new ApiException(HttpStatus.BAD_GATEWAY, "The AI provider returned an error (" + code + "). Try again.");
    }
}
