package com.designhub.integration.social;

import com.designhub.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import org.springframework.stereotype.Component;

/** X (Twitter) API v2 with OAuth 2.0 authorization code flow. Posts carry the image as a link. */
@Component
public class XAdapter implements SocialAdapter {
    private final AppProperties.Provider cfg;

    public XAdapter(AppProperties props) {
        this.cfg = props.social().x();
    }

    @Override public String platform() { return "x"; }

    @Override public boolean configured() { return !cfg.clientId().isBlank() && !cfg.clientSecret().isBlank(); }

    @Override
    public String authorizeUrl(String state, String redirectUri, String verifier) {
        return "https://twitter.com/i/oauth2/authorize?response_type=code&client_id=" + cfg.clientId()
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) + "&state=" + state
                + "&scope=" + URLEncoder.encode("tweet.read tweet.write users.read offline.access", StandardCharsets.UTF_8)
                + "&code_challenge=" + verifier + "&code_challenge_method=plain";
    }

    @Override
    public TokenResult exchange(String code, String redirectUri, String verifier) {
        String basic = Base64.getEncoder().encodeToString((cfg.clientId() + ":" + cfg.clientSecret()).getBytes(StandardCharsets.UTF_8));
        JsonNode token = OAuthHttp.form("https://api.twitter.com/2/oauth2/token", Map.of("grant_type", "authorization_code", "code", code,
                "redirect_uri", redirectUri, "code_verifier", verifier, "client_id", cfg.clientId()), basic);
        String access = token.path("access_token").asText();
        JsonNode me = OAuthHttp.get("https://api.twitter.com/2/users/me", access).path("data");
        return new TokenResult(access, token.path("refresh_token").asText(null), token.path("expires_in").asLong(0), me.path("id").asText(), "@" + me.path("username").asText());
    }

    @Override
    public String publish(String accessToken, String userId, String caption, String mediaUrl) {
        String text = mediaUrl == null || mediaUrl.isBlank() ? caption : caption + " " + mediaUrl;
        if (text.length() > 280) throw new SocialException("Posts on X are limited to 280 characters. Yours is " + text.length() + ".");
        return OAuthHttp.postJson("https://api.twitter.com/2/tweets", accessToken, Map.of("text", text), Map.of()).path("data").path("id").asText();
    }
}
