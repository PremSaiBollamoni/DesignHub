package com.designhub.service;

import com.designhub.config.AppProperties;
import com.designhub.domain.SocialAccount;
import com.designhub.exception.ApiException;
import com.designhub.integration.social.SocialAdapter;
import com.designhub.integration.social.SocialAdapter.SocialException;
import com.designhub.integration.social.SocialAdapter.TokenResult;
import com.designhub.repository.SocialAccountRepository;
import com.designhub.repository.SocialPostRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.designhub.util.CryptoService;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Account connection (OAuth) for every supported network. Tokens are encrypted at rest and never leave the server. */
@Slf4j
@Service
public class SocialAccountService {
    private static final long STATE_TTL_MS = 10 * 60 * 1000L;

    private final Map<String, SocialAdapter> adapters;
    private final SocialAccountRepository accounts;
    private final SocialPostRepository posts;
    private final UserRepository users;
    private final CryptoService crypto;
    private final AppProperties props;
    private final SecureRandom random = new SecureRandom();

    public SocialAccountService(List<SocialAdapter> adapters, SocialAccountRepository accounts, SocialPostRepository posts,
                                UserRepository users, CryptoService crypto, AppProperties props) {
        this.adapters = adapters.stream().collect(Collectors.toMap(SocialAdapter::platform, Function.identity()));
        this.accounts = accounts;
        this.posts = posts;
        this.users = users;
        this.crypto = crypto;
        this.props = props;
    }

    public record PlatformDto(String platform, boolean configured) {}

    public record AccountDto(Long id, String platform, String displayName, Instant connectedAt, boolean expired) {}

    public List<PlatformDto> platforms() {
        return adapters.values().stream().map(a -> new PlatformDto(a.platform(), a.configured())).sorted((a, b) -> a.platform().compareTo(b.platform())).toList();
    }

    @Transactional(readOnly = true)
    public List<AccountDto> list(AuthUser user) {
        return accounts.findByUserIdOrderByCreatedAtDesc(user.id()).stream().map(this::dto).toList();
    }

    public String connectUrl(AuthUser user, String platform) {
        SocialAdapter adapter = adapter(platform);
        if (!adapter.configured()) {
            throw ApiException.badRequest("Publishing to " + platform + " is not set up on this server yet. An administrator needs to add the " + platform + " app credentials.");
        }
        String verifier = nonce();
        String state = crypto.encrypt(user.id() + "|" + platform + "|" + System.currentTimeMillis() + "|" + verifier);
        return adapter.authorizeUrl(urlSafe(state), redirectUri(platform), verifier);
    }

    /** Completes the OAuth round trip. Returns the frontend URL the browser should land on. */
    @Transactional
    public String complete(String platform, String code, String state, String error) {
        String base = props.frontendUrl() + "/social";
        if (error != null || code == null || state == null) return base + "?error=" + (error == null ? "cancelled" : "denied");
        try {
            String[] s = crypto.decrypt(fromUrlSafe(state)).split("\\|");
            if (!s[1].equals(platform) || System.currentTimeMillis() - Long.parseLong(s[2]) > STATE_TTL_MS) return base + "?error=expired";
            Long userId = Long.valueOf(s[0]);
            SocialAdapter adapter = adapter(platform);
            TokenResult t = adapter.exchange(code, redirectUri(platform), s[3]);
            SocialAccount a = new SocialAccount();
            a.setUser(users.getReferenceById(userId));
            a.setPlatform(platform);
            a.setExternalId(t.externalId());
            a.setDisplayName(t.displayName());
            a.setEncryptedAccessToken(crypto.encrypt(t.accessToken()));
            if (t.refreshToken() != null) a.setEncryptedRefreshToken(crypto.encrypt(t.refreshToken()));
            if (t.expiresInSeconds() != null && t.expiresInSeconds() > 0) a.setTokenExpiresAt(Instant.now().plusSeconds(t.expiresInSeconds()));
            accounts.save(a);
            return base + "?connected=" + platform;
        } catch (SocialException e) {
            log.warn("Connecting {} failed: {}", platform, e.getMessage());
            return base + "?error=" + java.net.URLEncoder.encode(e.getMessage(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (RuntimeException e) {
            log.warn("Connecting {} failed", platform, e);
            return base + "?error=invalid";
        }
    }

    @Transactional
    public void disconnect(AuthUser user, Long accountId) {
        SocialAccount a = owned(user, accountId);
        if (posts.countByAccountId(accountId) > 0) {
            throw ApiException.conflict("This account still has posts. Delete them before disconnecting.");
        }
        accounts.delete(a);
    }

    public SocialAccount owned(AuthUser user, Long accountId) {
        return accounts.findById(accountId).filter(a -> a.getUser().getId().equals(user.id())).orElseThrow(() -> ApiException.notFound("Account"));
    }

    public String accessToken(SocialAccount a) {
        if (a.getTokenExpiresAt() != null && a.getTokenExpiresAt().isBefore(Instant.now())) {
            throw new SocialException("The connection to " + a.getPlatform() + " has expired. Reconnect the account.");
        }
        return crypto.decrypt(a.getEncryptedAccessToken());
    }

    public SocialAdapter adapter(String platform) {
        SocialAdapter a = adapters.get(platform);
        if (a == null) throw ApiException.notFound("Platform");
        return a;
    }

    private String redirectUri(String platform) {
        return props.publicUrl() + "/api/social/callback/" + platform;
    }

    private String nonce() {
        byte[] b = new byte[32];
        random.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private static String urlSafe(String b64) {
        return b64.replace('+', '-').replace('/', '_').replace("=", "");
    }

    private static String fromUrlSafe(String s) {
        String b = s.replace('-', '+').replace('_', '/');
        return b + "=".repeat((4 - b.length() % 4) % 4);
    }

    private AccountDto dto(SocialAccount a) {
        return new AccountDto(a.getId(), a.getPlatform(), a.getDisplayName(), a.getCreatedAt(),
                a.getTokenExpiresAt() != null && a.getTokenExpiresAt().isBefore(Instant.now()));
    }
}
