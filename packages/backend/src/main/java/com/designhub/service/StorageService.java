package com.designhub.service;

import com.designhub.config.AppProperties;
import com.designhub.domain.Asset;
import com.designhub.domain.BrandKit;
import com.designhub.exception.ApiException;
import com.designhub.repository.AssetRepository;
import com.designhub.repository.BrandKitRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import jakarta.annotation.PostConstruct;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {
    /** Extension allow-list by MIME. Anything else is refused so the file store can never serve executable content. */
    private static final Map<String, String> EXTENSIONS = Map.ofEntries(
            Map.entry("image/png", "png"), Map.entry("image/jpeg", "jpg"), Map.entry("image/gif", "gif"),
            Map.entry("image/webp", "webp"), Map.entry("image/svg+xml", "svg"), Map.entry("video/mp4", "mp4"),
            Map.entry("video/webm", "webm"), Map.entry("audio/mpeg", "mp3"), Map.entry("audio/wav", "wav"),
            Map.entry("audio/ogg", "ogg"), Map.entry("application/pdf", "pdf"), Map.entry("font/ttf", "ttf"),
            Map.entry("font/otf", "otf"), Map.entry("font/woff2", "woff2"), Map.entry("application/zip", "zip"));

    private final AppProperties props;
    private final AssetRepository assets;
    private final BrandKitRepository brandKits;
    private final UserRepository users;
    private final SubscriptionService subscriptions;
    private Path root;

    public record AssetDto(Long id, String kind, String fileName, String url, String mimeType, long sizeBytes, Integer width,
                           Integer height, Instant createdAt) {}

    @PostConstruct
    void init() throws IOException {
        root = Path.of(props.storage().dir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
        log.info("Asset storage at {}", root);
    }

    @Transactional
    public AssetDto store(AuthUser user, MultipartFile file, String kind, Long brandKitId) {
        if (file.isEmpty()) throw ApiException.badRequest("The selected file is empty");
        try (InputStream in = file.getInputStream()) {
            return store(user, in, file.getSize(), file.getContentType(), file.getOriginalFilename(), kind, brandKitId);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read upload", e);
        }
    }

    @Transactional
    public AssetDto storeBytes(AuthUser user, byte[] bytes, String mime, String fileName, String kind) {
        return store(user, new ByteArrayInputStream(bytes), bytes.length, mime, fileName, kind, null);
    }

    private AssetDto store(AuthUser user, InputStream in, long size, String mime, String original, String kind, Long brandKitId) {
        String ext = EXTENSIONS.get(mime == null ? "" : mime.toLowerCase(Locale.ROOT));
        if (ext == null) throw ApiException.badRequest("This file type is not supported. Upload PNG, JPG, GIF, WebP, SVG, MP4, WebM, MP3, WAV, PDF or a font file.");
        subscriptions.checkStorageQuota(user.id(), size);
        String stored = UUID.randomUUID() + "." + ext;
        Path target = root.resolve(stored).normalize();
        try {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not save upload", e);
        }
        Asset a = new Asset();
        a.setOwner(users.getReferenceById(user.id()));
        if (brandKitId != null) {
            BrandKit kit = brandKits.findById(brandKitId).filter(k -> k.getOwner().getId().equals(user.id())).orElseThrow(() -> ApiException.notFound("Brand kit"));
            a.setBrandKit(kit);
        }
        a.setKind(kind == null || kind.isBlank() ? kindOf(mime) : kind);
        a.setFileName(original == null ? stored : original);
        a.setStoredName(stored);
        a.setMimeType(mime);
        a.setSizeBytes(size);
        measure(target, mime, a);
        assets.save(a);
        return dto(a);
    }

    @Transactional(readOnly = true)
    public List<AssetDto> mine(AuthUser user, String kind) {
        return assets.findByOwnerIdOrderByCreatedAtDesc(user.id()).stream()
                .filter(a -> kind == null || kind.isBlank() || a.getKind().equals(kind)).map(this::dto).toList();
    }

    @Transactional(readOnly = true)
    public List<AssetDto> forBrandKit(Long brandKitId) {
        return assets.findByBrandKitIdOrderByCreatedAtDesc(brandKitId).stream().map(this::dto).toList();
    }

    @Transactional
    public void delete(AuthUser user, Long id) {
        Asset a = assets.findById(id).filter(x -> x.getOwner().getId().equals(user.id())).orElseThrow(() -> ApiException.notFound("File"));
        try {
            Files.deleteIfExists(root.resolve(a.getStoredName()).normalize());
        } catch (IOException e) {
            log.warn("Could not delete {}", a.getStoredName(), e);
        }
        assets.delete(a);
    }

    public Resource load(String storedName) {
        Path p = root.resolve(storedName).normalize();
        if (!p.startsWith(root) || !Files.isRegularFile(p)) throw ApiException.notFound("File");
        return new FileSystemResource(p);
    }

    public byte[] readBytes(String storedName) throws IOException {
        return Files.readAllBytes(load(storedName).getFile().toPath());
    }

    public static String kindOf(String mime) {
        if (mime == null) return "file";
        if (mime.startsWith("image/")) return "image";
        if (mime.startsWith("video/")) return "video";
        if (mime.startsWith("audio/")) return "audio";
        if (mime.startsWith("font/")) return "font";
        return "file";
    }

    private void measure(Path file, String mime, Asset a) {
        if (mime == null || !mime.startsWith("image/") || mime.equals("image/svg+xml")) return;
        try {
            BufferedImage img = ImageIO.read(file.toFile());
            if (img != null) {
                a.setWidth(img.getWidth());
                a.setHeight(img.getHeight());
            }
        } catch (IOException e) {
            log.debug("Could not measure {}", file, e);
        }
    }

    private AssetDto dto(Asset a) {
        return new AssetDto(a.getId(), a.getKind(), a.getFileName(), props.publicUrl() + "/api/files/" + a.getStoredName(),
                a.getMimeType(), a.getSizeBytes(), a.getWidth(), a.getHeight(), a.getCreatedAt() == null ? Instant.now() : a.getCreatedAt());
    }
}
