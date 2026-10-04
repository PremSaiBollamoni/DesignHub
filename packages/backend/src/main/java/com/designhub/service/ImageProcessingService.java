package com.designhub.service;

import com.designhub.exception.ApiException;
import com.designhub.integration.ml.MlWorkerClient;
import com.designhub.security.AuthUser;
import com.designhub.service.StorageService.AssetDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ImageProcessingService {
    private final MlWorkerClient ml;
    private final StorageService storage;
    private final SubscriptionService subscriptions;
    private final ObjectMapper mapper;

    public AssetDto removeBackground(AuthUser user, MultipartFile file) {
        subscriptions.checkAiQuota(user.id());
        byte[] png = ml.removeBackground(read(file));
        return storage.storeBytes(user, png, "image/png", "cutout.png", "image");
    }

    /**
     * Splits an image into editable layers: each detected region becomes a transparent PNG cut-out with its bounding box,
     * and the original with those regions removed is returned as the background layer.
     */
    public JsonNode decompose(AuthUser user, MultipartFile file, int maxSegments) {
        subscriptions.checkAiQuota(user.id());
        byte[] original = read(file);
        JsonNode result = ml.segment(original, Math.max(1, Math.min(maxSegments, 12)));
        ObjectNode out = mapper.createObjectNode();
        out.put("width", result.path("width").asInt());
        out.put("height", result.path("height").asInt());
        ArrayNode layers = out.putArray("layers");
        for (JsonNode seg : result.path("segments")) {
            byte[] cutout = Base64.getDecoder().decode(seg.path("cutout").asText());
            AssetDto asset = storage.storeBytes(user, cutout, "image/png", "layer.png", "image");
            ObjectNode layer = layers.addObject();
            layer.put("url", asset.url());
            layer.set("bbox", seg.path("bbox"));
            layer.put("score", seg.path("score").asDouble());
        }
        if (result.hasNonNull("background")) {
            byte[] bg = Base64.getDecoder().decode(result.get("background").asText());
            out.put("backgroundUrl", storage.storeBytes(user, bg, "image/png", "background.png", "image").url());
        }
        return out;
    }

    public AssetDto inpaint(AuthUser user, MultipartFile image, MultipartFile mask) {
        subscriptions.checkAiQuota(user.id());
        byte[] result = ml.inpaint(read(image), read(mask));
        return storage.storeBytes(user, result, "image/png", "inpainted.png", "image");
    }

    private byte[] read(MultipartFile f) {
        if (f.isEmpty()) throw ApiException.badRequest("Choose an image first");
        if (f.getContentType() == null || !f.getContentType().startsWith("image/")) throw ApiException.badRequest("Only image files can be processed");
        try {
            return f.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Could not read upload", e);
        }
    }
}
