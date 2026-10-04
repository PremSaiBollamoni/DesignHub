package com.designhub.integration.social;

import com.designhub.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PinterestAdapter implements SocialAdapter {
    private static final String API = "https://api.pinterest.com/v5";
    private final AppProperties.Provider cfg;

    public PinterestAdapter(AppProperties props) {
        this.cfg = props.social().pinterest();
    }

    @Override public String platform() { return "pinterest"; }

    @Override public boolean configured() { return !cfg.clientId().isBlank() && !cfg.clientSecret().isBlank(); }

    @Override
    public String authorizeUrl(String state, String redirectUri, String verifier) {
        return "https://www.pinterest.com/oauth/?response_type=code&client_id=" + cfg.clientId()
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) + "&state=" + state
                + "&scope=" + URLEncoder.encode("boards:read,pins:read,pins:write,user_accounts:read", StandardCharsets.UTF_8);
    }

    @Override
    public TokenResult exchange(String code, String redirectUri, String verifier) {
        String basic = Base64.getEncoder().encodeToString((cfg.clientId() + ":" + cfg.clientSecret()).getBytes(StandardCharsets.UTF_8));
        JsonNode token = OAuthHttp.form(API + "/oauth/token", Map.of("grant_type", "authorization_code", "code", code, "redirect_uri", redirectUri), basic);
        String access = token.path("access_token").asText();
        JsonNode me = OAuthHttp.get(API + "/user_account", access);
        JsonNode boards = OAuthHttp.get(API + "/boards?page_size=1", access).path("items").path(0);
        if (boards.isMissingNode()) throw new SocialException("Create a Pinterest board first, then connect again.");
        // The default board id travels in externalId so publishing needs no extra lookup.
        return new TokenResult(access, token.path("refresh_token").asText(null), token.path("expires_in").asLong(0), boards.path("id").asText(), me.path("username").asText());
    }

    @Override
    public String publish(String accessToken, String boardId, String caption, String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) throw new SocialException("Pins need an image. Export your design first.");
        Map<String, Object> body = Map.of("board_id", boardId, "description", caption, "title", caption.length() > 100 ? caption.substring(0, 100) : caption,
                "media_source", Map.of("source_type", "image_url", "url", mediaUrl));
        return OAuthHttp.postJson(API + "/pins", accessToken, body, Map.of()).path("id").asText();
    }
}
