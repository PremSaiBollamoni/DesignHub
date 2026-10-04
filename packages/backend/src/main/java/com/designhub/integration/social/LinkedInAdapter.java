package com.designhub.integration.social;

import com.designhub.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LinkedInAdapter implements SocialAdapter {
    private final AppProperties.Provider cfg;

    public LinkedInAdapter(AppProperties props) {
        this.cfg = props.social().linkedin();
    }

    @Override public String platform() { return "linkedin"; }

    @Override public boolean configured() { return !cfg.clientId().isBlank() && !cfg.clientSecret().isBlank(); }

    @Override
    public String authorizeUrl(String state, String redirectUri, String verifier) {
        return "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=" + cfg.clientId()
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) + "&state=" + state
                + "&scope=" + URLEncoder.encode("openid profile w_member_social", StandardCharsets.UTF_8);
    }

    @Override
    public TokenResult exchange(String code, String redirectUri, String verifier) {
        JsonNode token = OAuthHttp.form("https://www.linkedin.com/oauth/v2/accessToken", Map.of("grant_type", "authorization_code",
                "code", code, "redirect_uri", redirectUri, "client_id", cfg.clientId(), "client_secret", cfg.clientSecret()), null);
        String access = token.path("access_token").asText();
        JsonNode me = OAuthHttp.get("https://api.linkedin.com/v2/userinfo", access);
        return new TokenResult(access, token.path("refresh_token").asText(null), token.path("expires_in").asLong(0), me.path("sub").asText(), me.path("name").asText());
    }

    @Override
    public String publish(String accessToken, String memberId, String caption, String mediaUrl) {
        String text = mediaUrl == null || mediaUrl.isBlank() ? caption : caption + "\n" + mediaUrl;
        Map<String, Object> body = Map.of("author", "urn:li:person:" + memberId, "lifecycleState", "PUBLISHED",
                "specificContent", Map.of("com.linkedin.ugc.ShareContent", Map.of("shareCommentary", Map.of("text", text), "shareMediaCategory", "NONE")),
                "visibility", Map.of("com.linkedin.ugc.MemberNetworkVisibility", "PUBLIC"));
        return OAuthHttp.postJson("https://api.linkedin.com/v2/ugcPosts", accessToken, body, Map.of("X-Restli-Protocol-Version", "2.0.0")).path("id").asText();
    }
}
