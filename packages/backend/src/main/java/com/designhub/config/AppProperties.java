package com.designhub.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "designhub")
public record AppProperties(Jwt jwt, Crypto crypto, Cors cors, Storage storage, String publicUrl,
                            String frontendUrl, Ml ml, Social social, Google google, Ai ai, Access access, Mail mail) {

    public record Jwt(String secret, int expiryHours) {}
    public record Crypto(String masterKey) {}
    public record Cors(String allowedOrigins) {}
    public record Storage(String dir) {}
    public record Ml(String workerUrl) {}
    public record Social(Provider facebook, Provider linkedin, Provider x, Provider pinterest) {}
    public record Access(String allowedEmailDomains) {}
    public record Mail(String apiKey, String domain, String region, String from, String baseUrl) {}
    public record Ai(Boolean allowPrivateUrls) {}
    public record Google(String clientId) {}
    public record Provider(String clientId, String clientSecret) {}
}
