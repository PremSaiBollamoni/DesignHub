package com.designhub.web;

import com.designhub.security.AuthUser;
import com.designhub.service.StorageService;
import com.designhub.service.StorageService.AssetDto;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class UploadController {
    private final StorageService storage;

    @PostMapping(value = "/api/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AssetDto upload(@AuthenticationPrincipal AuthUser user, @RequestPart("file") MultipartFile file,
                           @RequestParam(required = false) String kind, @RequestParam(required = false) Long brandKitId) {
        return storage.store(user, file, kind, brandKitId);
    }

    @GetMapping("/api/upload")
    public List<AssetDto> mine(@AuthenticationPrincipal AuthUser user, @RequestParam(required = false) String kind) {
        return storage.mine(user, kind);
    }

    @DeleteMapping("/api/upload/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        storage.delete(user, id);
    }

    /** Public by design: names are unguessable UUIDs, so they work in plain img/video tags and exports. */
    @GetMapping("/api/files/{name:[A-Za-z0-9\\-]+\\.[a-z0-9]+}")
    public ResponseEntity<Resource> file(@PathVariable String name) throws IOException {
        Resource r = storage.load(name);
        String type = Files.probeContentType(r.getFile().toPath());
        if (name.endsWith(".svg")) type = "image/svg+xml";
        ResponseEntity.BodyBuilder b = ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:")
                .header("Cross-Origin-Resource-Policy", "cross-origin");
        return b.contentType(type == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(type)).body(r);
    }
}
