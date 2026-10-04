package com.designhub.service;

import com.designhub.domain.AISetting;
import com.designhub.exception.ApiException;
import com.designhub.integration.ai.AiClient;
import com.designhub.repository.AISettingRepository;
import com.designhub.repository.AIUsageRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.designhub.util.CryptoService;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@lombok.extern.slf4j.Slf4j
@Service
public class AiSettingService {
    private final AISettingRepository settings;
    private final AIUsageRepository usage;
    private final UserRepository users;
    private final CryptoService crypto;
    private final Map<String, AiClient> clients;
    private final boolean allowPrivateUrls;

    public AiSettingService(AISettingRepository settings, AIUsageRepository usage, UserRepository users, CryptoService crypto, List<AiClient> clients, com.designhub.config.AppProperties props) {
        this.allowPrivateUrls = props.ai() != null && Boolean.TRUE.equals(props.ai().allowPrivateUrls());
        this.settings = settings;
        this.usage = usage;
        this.users = users;
        this.crypto = crypto;
        this.clients = clients.stream().collect(Collectors.toMap(AiClient::id, Function.identity()));
    }

    /** The API key is write-only: responses only carry a masked hint. */
    public record SettingDto(String provider, String keyHint, String textModel, String imageModel, String baseUrl, boolean active,
                             boolean supportsImages, String defaultTextModel, String defaultImageModel) {}

    public record SettingRequest(@Size(max = 400) String apiKey, @Size(max = 120) String textModel, @Size(max = 120) String imageModel,
                                 @Size(max = 300) String baseUrl, Boolean active) {}

    public record TestRequest(@Size(max = 400) String apiKey, @Size(max = 120) String textModel, @Size(max = 300) String baseUrl, Boolean useIfWorks) {}

    public record TestResult(boolean ok, String message, String model, long latencyMs, String reply) {}

    public record UsageDto(String provider, String kind, long requests, long characters) {}

    @Transactional(readOnly = true)
    public List<SettingDto> list(AuthUser user) {
        Map<String, AISetting> saved = settings.findByUserId(user.id()).stream().collect(Collectors.toMap(AISetting::getProvider, s -> s));
        return clients.values().stream().sorted((a, b) -> a.id().compareTo(b.id())).map(c -> {
            AISetting s = saved.get(c.id());
            return new SettingDto(c.id(), s == null ? null : CryptoService.mask(crypto.decrypt(s.getEncryptedKey())),
                    s == null ? null : s.getTextModel(), s == null ? null : s.getImageModel(), s == null ? null : s.getBaseUrl(),
                    s != null && s.isActive(), c.supportsImages(), c.defaultTextModel(), c.defaultImageModel());
        }).toList();
    }

    @Transactional
    public void save(AuthUser user, String provider, SettingRequest req) {
        if (!clients.containsKey(provider)) throw ApiException.notFound("AI provider");
        checkBaseUrl(req.baseUrl());
        AISetting s = settings.findByUserIdAndProvider(user.id(), provider).orElse(null);
        if (s == null) {
            if (req.apiKey() == null || req.apiKey().isBlank()) throw ApiException.badRequest("Paste an API key to connect this provider");
            s = new AISetting();
            s.setUser(users.getReferenceById(user.id()));
            s.setProvider(provider);
        }
        if (req.apiKey() != null && !req.apiKey().isBlank()) s.setEncryptedKey(crypto.encrypt(req.apiKey().trim()));
        s.setTextModel(blankToNull(req.textModel()));
        s.setImageModel(blankToNull(req.imageModel()));
        s.setBaseUrl(blankToNull(req.baseUrl()));
        if (req.active() != null) s.setActive(req.active());
        if (s.isActive()) {
            settings.findByUserId(user.id()).stream().filter(o -> !o.getProvider().equals(provider)).forEach(o -> o.setActive(false));
        }
        settings.save(s);
    }

    @Transactional
    public void delete(AuthUser user, String provider) {
        settings.findByUserIdAndProvider(user.id(), provider).ifPresent(settings::delete);
    }

    /**
     * Sends one tiny request with the typed credentials (or the saved ones) so people learn immediately whether the
     * key and model name work. When it does and {@code useIfWorks} is set, the provider is saved and made active.
     */
    public TestResult test(AuthUser user, String provider, TestRequest req) {
        AiClient client = clients.get(provider);
        if (client == null) throw ApiException.notFound("AI provider");
        checkBaseUrl(req.baseUrl());
        AISetting saved = settings.findByUserIdAndProvider(user.id(), provider).orElse(null);
        String key = req.apiKey() != null && !req.apiKey().isBlank() ? req.apiKey().trim() : saved == null ? null : crypto.decrypt(saved.getEncryptedKey());
        if (key == null) throw ApiException.badRequest("Paste an API key first");
        String model = firstNonBlank(req.textModel(), saved == null ? null : saved.getTextModel(), client.defaultTextModel());
        String base = firstNonBlank(req.baseUrl(), saved == null ? null : saved.getBaseUrl(), null);
        long start = System.currentTimeMillis();
        try {
            String reply = client.text(new AiClient.AiCredentials(key, base, model, null), "You are a connection test. Answer in one short sentence.", "Reply with the word OK and nothing else.");
            long ms = System.currentTimeMillis() - start;
            if (Boolean.TRUE.equals(req.useIfWorks())) save(user, provider, new SettingRequest(req.apiKey(), model, null, base, true));
            String shown = reply.trim().length() > 80 ? reply.trim().substring(0, 80) : reply.trim();
            return new TestResult(true, "Connected. " + model + " answered in " + ms + " ms.", model, ms, shown);
        } catch (ApiException e) {
            return new TestResult(false, e.getMessage(), model, System.currentTimeMillis() - start, null);
        } catch (RuntimeException e) {
            log.warn("AI connection test failed unexpectedly: {}", e.toString());
            return new TestResult(false, "The provider replied in a way DesignHub could not read. Check the base URL and model name.", model, System.currentTimeMillis() - start, null);
        }
    }

    private void checkBaseUrl(String url) {
        if (url == null || url.isBlank() || allowPrivateUrls) return;
        try {
            java.net.URI u = java.net.URI.create(url.trim());
            if (!"https".equalsIgnoreCase(u.getScheme()) || u.getHost() == null) throw ApiException.badRequest("The base URL must start with https://");
            for (java.net.InetAddress a : java.net.InetAddress.getAllByName(u.getHost())) {
                if (a.isLoopbackAddress() || a.isSiteLocalAddress() || a.isLinkLocalAddress() || a.isAnyLocalAddress()) {
                    throw ApiException.badRequest("That address points inside a private network, which is not allowed.");
                }
            }
        } catch (IllegalArgumentException | java.net.UnknownHostException e) {
            throw ApiException.badRequest("That base URL could not be understood.");
        }
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v.trim();
        return null;
    }

    @Transactional(readOnly = true)
    public List<UsageDto> usageSummary(AuthUser user) {
        return usage.summary(user.id(), Instant.now().minus(30, ChronoUnit.DAYS)).stream()
                .map(s -> new UsageDto(s.getProvider(), s.getKind(), s.getRequests(), s.getChars() == null ? 0 : s.getChars())).toList();
    }

    /** Resolves the caller's active provider and decrypts its key just for this request. */
    @Transactional(readOnly = true)
    public Resolved resolve(AuthUser user, boolean needImages) {
        AISetting s = settings.findFirstByUserIdAndActiveTrue(user.id())
                .orElseThrow(() -> ApiException.badRequest("Connect an AI provider in AI settings to use this feature"));
        AiClient client = clients.get(s.getProvider());
        if (needImages && !client.supportsImages()) {
            throw ApiException.badRequest(s.getProvider() + " cannot generate images. Activate OpenAI or Google in AI settings.");
        }
        var creds = new AiClient.AiCredentials(crypto.decrypt(s.getEncryptedKey()), s.getBaseUrl(),
                s.getTextModel() == null ? client.defaultTextModel() : s.getTextModel(),
                s.getImageModel() == null ? client.defaultImageModel() : s.getImageModel());
        return new Resolved(client, creds);
    }

    public record Resolved(AiClient client, AiClient.AiCredentials creds) {}

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
