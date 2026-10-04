package com.designhub.config;

import com.designhub.domain.Access;
import com.designhub.security.AuthUser;
import com.designhub.security.JwtService;
import com.designhub.service.AccessService;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private static final Pattern PROJECT_TOPIC = Pattern.compile("^/topic/project\\.(\\d+)(\\..+)?$");

    private final AppProperties props;
    private final JwtService jwt;
    private final AccessService access;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(props.cors().allowedOrigins().split(","));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        registry.enableSimpleBroker("/topic", "/queue").setHeartbeatValue(new long[]{10000, 10000}).setTaskScheduler(scheduler);
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // One thread keeps operations in the exact order each client sent them (a page must exist before its
        // elements arrive). Every operation is a few indexed writes, so a single worker is ample per node.
        registration.taskExecutor().corePoolSize(1).maxPoolSize(1);
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) return message;
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String header = accessor.getFirstNativeHeader("Authorization");
                    AuthUser user = header != null && header.startsWith("Bearer ")
                            ? jwt.parse(header.substring(7)).orElse(null) : null;
                    if (user == null) throw new MessagingException("Sign in again to collaborate");
                    accessor.setUser(user);
                } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    authorizeSubscription(accessor);
                }
                return message;
            }
        });
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !(accessor.getUser() instanceof AuthUser user)) throw new MessagingException("Not authenticated");
        Matcher m = PROJECT_TOPIC.matcher(destination);
        if (m.matches()) {
            access.require(Long.valueOf(m.group(1)), user, Access.VIEWER);
        } else if (!destination.startsWith("/user/")) {
            throw new MessagingException("Unknown destination");
        }
    }
}
