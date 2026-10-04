package com.designhub.integration.social;

import com.designhub.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Instagram professional accounts linked to a Facebook Page (Content Publishing API). Reuses the Meta app credentials. */
@Component
public class InstagramAdapter implements SocialAdapter {
    private static final String GRAPH = "https://graph.facebook.com/v21.0";
    private final AppProperties.Provider cfg;

    public InstagramAdapter(AppProperties props) {
        this.cfg = props.social().facebook();
    }

    @Override public String platform() { return "instagram"; }

    @Override public boolean configured() { return !cfg.clientId().isBlank() && !cfg.clientSecret().isBlank(); }

    @Override
    public String authorizeUrl(String state, String redirectUri, String verifier) {
        return "https://www.facebook.com/v21.0/dialog/oauth?client_id=" + cfg.clientId() + "&redirect_uri="
                + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) + "&state=" + state
                + "&scope=instagram_basic,instagram_content_publish,pages_show_list";
    }

    @Override
    public TokenResult exchange(String code, String redirectUri, String verifier) {
        JsonNode token = OAuthHttp.form(GRAPH + "/oauth/access_token", Map.of("client_id", cfg.clientId(),
                "client_secret", cfg.clientSecret(), "redirect_uri", redirectUri, "code", code), null);
        String access = token.path("access_token").asText();
        JsonNode pages = OAuthHttp.get(GRAPH + "/me/accounts?fields=instagram_business_account{id,username}", access);
        for (JsonNode page : pages.path("data")) {
            JsonNode ig = page.path("instagram_business_account");
            if (ig.hasNonNull("id")) return new TokenResult(access, null, token.path("expires_in").asLong(0), ig.path("id").asText(), "@" + ig.path("username").asText());
        }
        throw new SocialException("No Instagram professional account is linked to your Facebook Pages.");
    }

    @Override
    public String publish(String accessToken, String igUserId, String caption, String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) throw new SocialException("Instagram posts need an image. Export your design first.");
        String container = OAuthHttp.form(GRAPH + "/" + igUserId + "/media", Map.of("image_url", mediaUrl, "caption", caption, "access_token", accessToken), null).path("id").asText();
        return OAuthHttp.form(GRAPH + "/" + igUserId + "/media_publish", Map.of("creation_id", container, "access_token", accessToken), null).path("id").asText();
    }
}
