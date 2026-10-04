package com.designhub.integration.social;

import com.designhub.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Facebook Pages publishing through the Graph API. */
@Component
public class MetaAdapter implements SocialAdapter {
    private static final String GRAPH = "https://graph.facebook.com/v21.0";
    private final AppProperties.Provider cfg;

    public MetaAdapter(AppProperties props) {
        this.cfg = props.social().facebook();
    }

    @Override public String platform() { return "facebook"; }

    @Override public boolean configured() { return !cfg.clientId().isBlank() && !cfg.clientSecret().isBlank(); }

    @Override
    public String authorizeUrl(String state, String redirectUri, String verifier) {
        return "https://www.facebook.com/v21.0/dialog/oauth?client_id=" + cfg.clientId() + "&redirect_uri=" + enc(redirectUri)
                + "&state=" + state + "&scope=pages_show_list,pages_manage_posts,pages_read_engagement";
    }

    @Override
    public TokenResult exchange(String code, String redirectUri, String verifier) {
        JsonNode token = OAuthHttp.form(GRAPH + "/oauth/access_token", Map.of("client_id", cfg.clientId(),
                "client_secret", cfg.clientSecret(), "redirect_uri", redirectUri, "code", code), null);
        JsonNode pages = OAuthHttp.get(GRAPH + "/me/accounts?fields=id,name,access_token", token.path("access_token").asText());
        JsonNode page = pages.path("data").path(0);
        if (page.isMissingNode()) throw new SocialException("No Facebook Page was found on this account. Create or get access to a Page first.");
        return new TokenResult(page.path("access_token").asText(), null, null, page.path("id").asText(), page.path("name").asText());
    }

    @Override
    public String publish(String accessToken, String pageId, String caption, String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) {
            return OAuthHttp.form(GRAPH + "/" + pageId + "/feed", Map.of("message", caption, "access_token", accessToken), null).path("id").asText();
        }
        return OAuthHttp.form(GRAPH + "/" + pageId + "/photos", Map.of("url", mediaUrl, "caption", caption, "access_token", accessToken), null).path("id").asText();
    }

    private static String enc(String v) {
        return URLEncoder.encode(v, StandardCharsets.UTF_8);
    }
}
