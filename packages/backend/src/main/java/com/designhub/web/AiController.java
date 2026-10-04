package com.designhub.web;

import com.designhub.security.AuthUser;
import com.designhub.service.AiService;
import com.designhub.service.AiService.AiDesign;
import com.designhub.service.AiSettingService;
import com.designhub.service.AiSettingService.*;
import com.designhub.service.ImageProcessingService;
import com.designhub.service.StorageService.AssetDto;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class AiController {
    private final AiService ai;
    private final AiSettingService settings;
    private final ImageProcessingService images;

    public record TextRequest(@NotBlank @Size(max = 4000) String prompt, @Size(max = 600) String instruction) {}

    public record ImageRequest(@NotBlank @Size(max = 2000) String prompt, @Min(64) @Max(4096) Integer width, @Min(64) @Max(4096) Integer height) {}

    public record DesignRequest(@NotBlank @Size(max = 2000) String brief, @Min(64) @Max(16000) int width, @Min(64) @Max(16000) int height,
                                @Size(max = 500) String brand) {}

    @GetMapping("/api/ai-settings")
    public List<SettingDto> listSettings(@AuthenticationPrincipal AuthUser user) {
        return settings.list(user);
    }

    @PutMapping("/api/ai-settings/{provider}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveSetting(@AuthenticationPrincipal AuthUser user, @PathVariable String provider, @Valid @RequestBody SettingRequest req) {
        settings.save(user, provider, req);
    }

    @PostMapping("/api/ai-settings/{provider}/test")
    public TestResult testSetting(@AuthenticationPrincipal AuthUser user, @PathVariable String provider, @Valid @RequestBody TestRequest req) {
        return settings.test(user, provider, req);
    }

    @DeleteMapping("/api/ai-settings/{provider}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSetting(@AuthenticationPrincipal AuthUser user, @PathVariable String provider) {
        settings.delete(user, provider);
    }

    @GetMapping("/api/ai-settings/usage")
    public List<UsageDto> usage(@AuthenticationPrincipal AuthUser user) {
        return settings.usageSummary(user);
    }

    @PostMapping("/api/ai/text")
    public Map<String, String> text(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody TextRequest req) {
        String system = req.instruction() == null || req.instruction().isBlank()
                ? "You are a concise copywriter for graphic designs. Reply with the copy only, no preamble or quotes." : req.instruction();
        return Map.of("text", ai.text(user, system, req.prompt()));
    }

    @PostMapping("/api/ai/image")
    public AssetDto image(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody ImageRequest req) {
        return ai.image(user, req.prompt(), req.width() == null ? 1024 : req.width(), req.height() == null ? 1024 : req.height());
    }

    @PostMapping("/api/ai/design")
    public AiDesign design(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody DesignRequest req) {
        return ai.design(user, req.brief(), req.width(), req.height(), req.brand());
    }

    @PostMapping(value = "/api/background-removal", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AssetDto removeBackground(@AuthenticationPrincipal AuthUser user, @RequestPart("image") MultipartFile image) {
        return images.removeBackground(user, image);
    }

    @PostMapping(value = "/api/design-decomposition", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JsonNode decompose(@AuthenticationPrincipal AuthUser user, @RequestPart("image") MultipartFile image,
                              @RequestParam(defaultValue = "8") int maxLayers) {
        return images.decompose(user, image, maxLayers);
    }

    @PostMapping(value = "/api/design-decomposition/inpaint", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AssetDto inpaint(@AuthenticationPrincipal AuthUser user, @RequestPart("image") MultipartFile image, @RequestPart("mask") MultipartFile mask) {
        return images.inpaint(user, image, mask);
    }
}
