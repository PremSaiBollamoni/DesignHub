package com.designhub.web;

import com.designhub.security.AuthUser;
import com.designhub.service.ApprovalService;
import com.designhub.service.ApprovalService.ApprovalDto;
import com.designhub.service.ApprovalService.SubmitResult;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalController {
    private final ApprovalService approvals;

    public record SubmitRequest(@Size(max = 2000) String message) {}

    public record ApproveRequest(@Size(max = 3000) String caption) {}

    public record ChangesRequest(@Size(max = 2000) String feedback) {}

    @GetMapping("/project/{projectId}")
    public ApprovalDto status(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId) {
        return approvals.status(user, projectId);
    }

    @GetMapping("/waiting")
    public List<Map<String, Object>> waiting(@AuthenticationPrincipal AuthUser user) {
        return approvals.waitingForMe(user);
    }

    @PostMapping("/project/{projectId}/submit")
    public SubmitResult submit(@AuthenticationPrincipal AuthUser user, @PathVariable Long projectId, @RequestBody(required = false) SubmitRequest req) {
        return approvals.submit(user, projectId, req == null ? null : req.message());
    }

    @PostMapping("/{id}/approve")
    public ApprovalDto approve(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @RequestBody(required = false) ApproveRequest req) {
        return approvals.approve(user, id, req == null ? null : req.caption());
    }

    @PostMapping("/{id}/request-changes")
    public ApprovalDto requestChanges(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @RequestBody ChangesRequest req) {
        return approvals.requestChanges(user, id, req.feedback());
    }
}
