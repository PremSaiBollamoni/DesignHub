package com.designhub.service;

import com.designhub.config.AppProperties;
import com.designhub.exception.ApiException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Decides which email addresses may use the product. Checked on every way in, so the browser can never bypass it. */
@Component
public class EmailPolicy {
    private final List<String> domains;

    public EmailPolicy(AppProperties props) {
        String raw = props.access() == null || props.access().allowedEmailDomains() == null ? "" : props.access().allowedEmailDomains();
        this.domains = Arrays.stream(raw.split(",")).map(d -> d.trim().toLowerCase(Locale.ROOT).replaceFirst("^@", "")).filter(d -> !d.isEmpty()).toList();
    }

    public List<String> domains() {
        return domains;
    }

    public boolean allows(String email) {
        if (domains.isEmpty()) return true;
        if (email == null) return false;
        String e = email.trim().toLowerCase(Locale.ROOT);
        int at = e.lastIndexOf('@');
        if (at < 1) return false;
        String host = e.substring(at + 1);
        // Exact domain or a real subdomain; "evilcutm.ac.in" must not pass for "cutm.ac.in".
        return domains.stream().anyMatch(d -> host.equals(d) || host.endsWith("." + d));
    }

    public void require(String email) {
        if (!allows(email)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "DesignHub is limited to " + String.join(", ", domains) + " email addresses.");
        }
    }
}
