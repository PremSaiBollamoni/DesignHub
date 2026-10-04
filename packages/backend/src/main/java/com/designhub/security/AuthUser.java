package com.designhub.security;

import java.security.Principal;

/** Authenticated caller, rebuilt from the JWT claims on each request (no DB hit). */
public record AuthUser(Long id, String email, String name, String role) implements Principal {
    @Override
    public String getName() {
        return String.valueOf(id);
    }

    public String displayName() {
        return name;
    }
}
