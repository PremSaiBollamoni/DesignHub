package com.designhub.integration.social;

/** One adapter per network. Controllers and services only ever talk to this interface. */
public interface SocialAdapter {
    String platform();

    /** True when the server has the developer-app credentials needed for this network. */
    boolean configured();

    String authorizeUrl(String state, String redirectUri, String codeVerifier);

    TokenResult exchange(String code, String redirectUri, String codeVerifier);

    /** Publishes and returns the network's id for the new post. Throws {@link SocialException} with a user-facing message. */
    String publish(String accessToken, String externalAccountId, String caption, String mediaUrl);

    record TokenResult(String accessToken, String refreshToken, Long expiresInSeconds, String externalId, String displayName) {}

    class SocialException extends RuntimeException {
        public SocialException(String message) {
            super(message);
        }
    }
}
