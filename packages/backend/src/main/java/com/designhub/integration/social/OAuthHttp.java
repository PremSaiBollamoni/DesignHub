package com.designhub.integration.social;

import com.designhub.integration.social.SocialAdapter.SocialException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Shared HTTP helpers so adapters stay focused on each network's protocol. */
@Slf4j
final class OAuthHttp {
    private static final RestClient HTTP = RestClient.create();

    private OAuthHttp() {}

    static JsonNode form(String url, Map<String, String> fields, String basicAuth) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        fields.forEach(body::add);
        try {
            var req = HTTP.post().uri(url).contentType(MediaType.APPLICATION_FORM_URLENCODED);
            if (basicAuth != null) req = req.header("Authorization", "Basic " + basicAuth);
            return req.body(body).retrieve().body(JsonNode.class);
        } catch (RestClientResponseException e) {
            throw failure(url, e);
        }
    }

    static JsonNode get(String url, String bearer) {
        try {
            return HTTP.get().uri(url).header("Authorization", "Bearer " + bearer).retrieve().body(JsonNode.class);
        } catch (RestClientResponseException e) {
            throw failure(url, e);
        }
    }

    static JsonNode postJson(String url, String bearer, Object body, Map<String, String> extraHeaders) {
        try {
            var req = HTTP.post().uri(url).contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + bearer);
            for (var h : extraHeaders.entrySet()) req = req.header(h.getKey(), h.getValue());
            return req.body(body).retrieve().body(JsonNode.class);
        } catch (RestClientResponseException e) {
            throw failure(url, e);
        }
    }

    private static SocialException failure(String url, RestClientResponseException e) {
        log.warn("Social API {} failed with {}", url.replaceAll("\\?.*", ""), e.getStatusCode().value());
        String detail = e.getResponseBodyAsString();
        if (detail.length() > 240) detail = detail.substring(0, 240);
        return new SocialException("The network rejected the request (" + e.getStatusCode().value() + "). " + detail);
    }
}
