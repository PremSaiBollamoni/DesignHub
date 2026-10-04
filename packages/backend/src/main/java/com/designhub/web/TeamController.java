package com.designhub.web;

import com.designhub.domain.Access;
import com.designhub.security.AuthUser;
import com.designhub.service.TeamService;
import com.designhub.service.TeamService.MemberDto;
import com.designhub.service.TeamService.TeamDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {
    private final TeamService teams;

    public record TeamRequest(@NotBlank(message = "Name your team") @Size(max = 120) String name) {}

    public record MemberRequest(@NotBlank String email, Access role) {}

    @GetMapping
    public List<TeamDto> list(@AuthenticationPrincipal AuthUser user) {
        return teams.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamDto create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody TeamRequest req) {
        return teams.create(user, req.name());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        teams.delete(user, id);
    }

    @GetMapping("/{id}/members")
    public List<MemberDto> members(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return teams.members(user, id);
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberDto addMember(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @RequestBody MemberRequest req) {
        return teams.addMember(user, id, req.email(), req.role() == null ? Access.MAKER : req.role());
    }

    @DeleteMapping("/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @PathVariable Long userId) {
        teams.removeMember(user, id, userId);
    }
}
