package com.designhub.web;

import com.designhub.security.AuthUser;
import com.designhub.service.SocialAccountService;
import com.designhub.service.SocialAccountService.AccountDto;
import com.designhub.service.SocialAccountService.PlatformDto;
import com.designhub.service.SocialPostService;
import com.designhub.service.SocialPostService.PostDto;
import com.designhub.service.SocialPostService.PostRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/social")
@RequiredArgsConstructor
public class SocialController {
    private final SocialAccountService accounts;
    private final SocialPostService posts;

    public record ReviewRequest(boolean approve, String feedback) {}

    public record PublishRequest(Instant at) {}

    @GetMapping("/platforms")
    public List<PlatformDto> platforms() {
        return accounts.platforms();
    }

    @GetMapping("/accounts")
    public List<AccountDto> accounts(@AuthenticationPrincipal AuthUser user) {
        return accounts.list(user);
    }

    @PostMapping("/accounts/connect/{platform}")
    public Map<String, String> connect(@AuthenticationPrincipal AuthUser user, @PathVariable String platform) {
        return Map.of("url", accounts.connectUrl(user, platform));
    }

    /** Browser redirect target for the network's consent screen; the state parameter carries the signed-in user. */
    @GetMapping("/callback/{platform}")
    public void callback(@PathVariable String platform, @RequestParam(required = false) String code, @RequestParam(required = false) String state,
                         @RequestParam(required = false) String error, HttpServletResponse response) throws IOException {
        response.sendRedirect(accounts.complete(platform, code, state, error));
    }

    @DeleteMapping("/accounts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disconnect(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        accounts.disconnect(user, id);
    }

    @GetMapping("/posts")
    public List<PostDto> posts(@AuthenticationPrincipal AuthUser user) {
        return posts.list(user);
    }

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody PostRequest req) {
        return posts.create(user, req);
    }

    @PostMapping("/posts/{id}/submit")
    public PostDto submit(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return posts.submit(user, id);
    }

    @PostMapping("/posts/{id}/review")
    public PostDto review(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @RequestBody ReviewRequest req) {
        return posts.review(user, id, req.approve(), req.feedback());
    }

    @PostMapping("/posts/{id}/publish")
    public PostDto publish(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @RequestBody(required = false) PublishRequest req) {
        return posts.publish(user, id, req == null ? null : req.at());
    }

    @DeleteMapping("/posts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        posts.delete(user, id);
    }
}
