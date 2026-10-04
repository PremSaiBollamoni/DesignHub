package com.designhub.integration.ml;

import com.designhub.config.AppProperties;
import com.designhub.exception.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Talks to the Python ML worker (packages/ml-worker). Heavy models stay out of the JVM. */
@Slf4j
@Component
public class MlWorkerClient {
    private final RestClient http;

    public MlWorkerClient(AppProperties props) {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(120_000);
        this.http = RestClient.builder().baseUrl(props.ml().workerUrl()).requestFactory(factory).build();
    }

    public byte[] removeBackground(byte[] image) {
        return postBinary("/remove-background", image, "image.png");
    }

    /** Returns {"width":..,"height":..,"segments":[{"bbox":[x,y,w,h],"mask":"<base64 png>","score":..}]}. */
    public JsonNode segment(byte[] image, int maxSegments) {
        return postJson("/segment?max_segments=" + maxSegments, image);
    }

    public byte[] inpaint(byte[] image, byte[] mask) {
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("image", named(image, "image.png"));
        parts.add("mask", named(mask, "mask.png"));
        try {
            return http.post().uri("/inpaint").contentType(MediaType.MULTIPART_FORM_DATA).body(parts).retrieve().body(byte[].class);
        } catch (RuntimeException e) {
            throw translate(e);
        }
    }

    private byte[] postBinary(String path, byte[] image, String name) {
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("image", named(image, name));
        try {
            return http.post().uri(path).contentType(MediaType.MULTIPART_FORM_DATA).body(parts).retrieve().body(byte[].class);
        } catch (RuntimeException e) {
            throw translate(e);
        }
    }

    private JsonNode postJson(String path, byte[] image) {
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("image", named(image, "image.png"));
        try {
            return http.post().uri(path).contentType(MediaType.MULTIPART_FORM_DATA).body(parts).retrieve().body(JsonNode.class);
        } catch (RuntimeException e) {
            throw translate(e);
        }
    }

    private static ByteArrayResource named(byte[] bytes, String filename) {
        return new ByteArrayResource(bytes) {
            @Override public String getFilename() { return filename; }
        };
    }

    private ApiException translate(RuntimeException e) {
        if (e instanceof ResourceAccessException) {
            log.warn("ML worker unreachable: {}", e.getMessage());
            return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "The image processing service is not running. Start the ML worker and try again.");
        }
        if (e instanceof RestClientResponseException r) {
            log.warn("ML worker error {}", r.getStatusCode().value());
            return new ApiException(HttpStatus.BAD_GATEWAY, "The image processing service could not handle this image.");
        }
        throw e;
    }
}
