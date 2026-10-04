package com.designhub.integration.mail;

import com.designhub.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Sends transactional email through Mailgun. Without an API key it logs and reports the mail as not sent. */
@Slf4j
@Service
public class MailService {
    public record Mail(String to, String name, String subject, String text, String html) {}

    public record Delivery(String email, String name, boolean sent, String problem) {}

    private final AppProperties.Mail cfg;
    private final RestClient http = RestClient.create();

    public MailService(AppProperties props) {
        this.cfg = props.mail();
    }

    public boolean configured() {
        return cfg != null && cfg.apiKey() != null && !cfg.apiKey().isBlank();
    }

    private String base() {
        if (cfg.baseUrl() != null && !cfg.baseUrl().isBlank()) return cfg.baseUrl().replaceAll("/+$", "");
        return "eu".equalsIgnoreCase(cfg.region()) ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
    }

    public List<Delivery> sendAll(List<Mail> mails) {
        return mails.stream().map(this::send).toList();
    }

    public Delivery send(Mail m) {
        if (!configured()) {
            log.info("Mail to {} not sent: Mailgun is not configured", m.to());
            return new Delivery(m.to(), m.name(), false, "Email is not set up on the server yet");
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("from", cfg.from());
        form.add("to", m.name() == null || m.name().isBlank() ? m.to() : m.name() + " <" + m.to() + ">");
        form.add("subject", m.subject());
        form.add("text", m.text());
        if (m.html() != null) form.add("html", m.html());
        try {
            http.post().uri(base() + "/v3/" + cfg.domain() + "/messages").headers(h -> h.setBasicAuth("api", cfg.apiKey()))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(JsonNode.class);
            log.info("Mail sent to {}", m.to());
            return new Delivery(m.to(), m.name(), true, null);
        } catch (RestClientResponseException e) {
            int code = e.getStatusCode().value();
            String detail = e.getResponseBodyAsString();
            log.warn("Mailgun refused mail to {} ({}): {}", m.to(), code, detail.length() > 200 ? detail.substring(0, 200) : detail);
            if (code == 401) return new Delivery(m.to(), m.name(), false, "Mailgun rejected the API key");
            if (code == 403 || detail.toLowerCase().contains("authorized recipient") || detail.toLowerCase().contains("sandbox")) {
                return new Delivery(m.to(), m.name(), false, "Sandbox only sends to authorised recipients. Add this address in Mailgun");
            }
            if (code == 404) return new Delivery(m.to(), m.name(), false, "Mailgun does not know the domain " + cfg.domain() + ". Check the region");
            return new Delivery(m.to(), m.name(), false, "Mailgun returned an error (" + code + ")");
        } catch (ResourceAccessException e) {
            log.warn("Mailgun unreachable: {}", e.getMessage());
            return new Delivery(m.to(), m.name(), false, "Mailgun could not be reached");
        }
    }
}
