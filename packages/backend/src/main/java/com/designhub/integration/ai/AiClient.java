package com.designhub.integration.ai;

/** One implementation per provider family. Keys are passed per call and never retained. */
public interface AiClient {
    String id();

    String defaultTextModel();

    String defaultImageModel();

    boolean supportsImages();

    String text(AiCredentials creds, String system, String prompt);

    /** Returns raw image bytes (PNG/JPEG). */
    GeneratedImage image(AiCredentials creds, String prompt, int width, int height);

    record AiCredentials(String apiKey, String baseUrl, String textModel, String imageModel) {}

    record GeneratedImage(byte[] bytes, String mime) {}
}
