package com.designhub.service;

import com.designhub.domain.Notification;
import com.designhub.repository.NotificationRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository repo;
    private final UserRepository users;
    private final SimpMessagingTemplate messaging;

    public record NotificationDto(Long id, String type, String message, String link, Instant createdAt, boolean read) {}

    /** Persists the notification and pushes it to the recipient's open sessions. */
    @Transactional
    public void send(Long recipientId, String type, String message, String link) {
        Notification n = new Notification();
        n.setUser(users.getReferenceById(recipientId));
        n.setType(type);
        n.setMessage(message.length() > 300 ? message.substring(0, 297) + "..." : message);
        n.setLink(link);
        repo.save(n);
        messaging.convertAndSendToUser(String.valueOf(recipientId), "/queue/notifications", dto(n));
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(AuthUser user, int limit) {
        return repo.findByUserIdOrderByCreatedAtDesc(user.id(), PageRequest.of(0, Math.max(1, Math.min(limit, 100))))
                .stream().map(this::dto).toList();
    }

    @Transactional(readOnly = true)
    public long unread(AuthUser user) {
        return repo.countByUserIdAndReadAtIsNull(user.id());
    }

    @Transactional
    public void markRead(AuthUser user, Long id) {
        repo.findById(id).filter(n -> n.getUser().getId().equals(user.id())).ifPresent(n -> n.setReadAt(Instant.now()));
    }

    @Transactional
    public void markAllRead(AuthUser user) {
        repo.markAllRead(user.id());
    }

    private NotificationDto dto(Notification n) {
        return new NotificationDto(n.getId(), n.getType(), n.getMessage(), n.getLink(),
                n.getCreatedAt() == null ? Instant.now() : n.getCreatedAt(), n.getReadAt() != null);
    }
}
