package com.designhub.service;

import com.designhub.domain.EmailSetting;
import com.designhub.domain.Preference;
import com.designhub.exception.ApiException;
import com.designhub.repository.EmailSettingRepository;
import com.designhub.repository.PreferenceRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PreferenceService {
    private static final Pattern KEY = Pattern.compile("^[a-zA-Z0-9._-]{1,80}$");

    private final PreferenceRepository prefs;
    private final EmailSettingRepository emailSettings;
    private final UserRepository users;

    public record EmailSettingsDto(boolean comments, boolean mentions, boolean invitations, boolean approvals, boolean productUpdates) {}

    @Transactional(readOnly = true)
    public Map<String, String> all(AuthUser user) {
        Map<String, String> out = new LinkedHashMap<>();
        prefs.findByUserId(user.id()).forEach(p -> out.put(p.getPrefKey(), p.getPrefValue()));
        return out;
    }

    @Transactional
    public void put(AuthUser user, String key, String value) {
        if (!KEY.matcher(key).matches()) throw ApiException.badRequest("Invalid preference key");
        if (value != null && value.length() > 20000) throw ApiException.badRequest("Preference value is too large");
        Preference p = prefs.findByUserIdAndPrefKey(user.id(), key).orElseGet(() -> {
            Preference n = new Preference();
            n.setUser(users.getReferenceById(user.id()));
            n.setPrefKey(key);
            return n;
        });
        p.setPrefValue(value);
        prefs.save(p);
    }

    @Transactional
    public EmailSettingsDto emailSettings(AuthUser user) {
        return toDto(emailSettings.findByUserId(user.id()).orElseGet(() -> {
            EmailSetting s = new EmailSetting();
            s.setUser(users.getReferenceById(user.id()));
            return emailSettings.save(s);
        }));
    }

    @Transactional
    public EmailSettingsDto updateEmailSettings(AuthUser user, EmailSettingsDto dto) {
        emailSettings(user);
        EmailSetting s = emailSettings.findByUserId(user.id()).orElseThrow();
        s.setComments(dto.comments());
        s.setMentions(dto.mentions());
        s.setInvitations(dto.invitations());
        s.setApprovals(dto.approvals());
        s.setProductUpdates(dto.productUpdates());
        return toDto(s);
    }

    private EmailSettingsDto toDto(EmailSetting s) {
        return new EmailSettingsDto(s.isComments(), s.isMentions(), s.isInvitations(), s.isApprovals(), s.isProductUpdates());
    }
}
