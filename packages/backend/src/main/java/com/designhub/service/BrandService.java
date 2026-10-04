package com.designhub.service;

import com.designhub.domain.BrandKit;
import com.designhub.exception.ApiException;
import com.designhub.repository.AssetRepository;
import com.designhub.repository.BrandKitRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BrandService {
    private final BrandKitRepository kits;
    private final AssetRepository assets;
    private final UserRepository users;
    private final StorageService storage;
    private final ObjectMapper mapper;

    public record BrandRequest(@NotBlank(message = "Name your brand kit") @Size(max = 120) String name, JsonNode colors,
                               JsonNode fonts, @Size(max = 8000) String guidelines) {}

    public record BrandDto(Long id, String name, JsonNode colors, JsonNode fonts, String guidelines,
                           List<StorageService.AssetDto> assets) {}

    @Transactional(readOnly = true)
    public List<BrandDto> list(AuthUser user) {
        return kits.findByOwnerIdOrderByCreatedAtAsc(user.id()).stream().map(this::dto).toList();
    }

    @Transactional
    public BrandDto create(AuthUser user, BrandRequest req) {
        BrandKit k = new BrandKit();
        k.setOwner(users.getReferenceById(user.id()));
        apply(k, req);
        kits.save(k);
        return dto(k);
    }

    @Transactional
    public BrandDto update(AuthUser user, Long id, BrandRequest req) {
        BrandKit k = owned(user, id);
        apply(k, req);
        return dto(k);
    }

    @Transactional
    public void delete(AuthUser user, Long id) {
        BrandKit k = owned(user, id);
        assets.findByBrandKitIdOrderByCreatedAtDesc(id).forEach(a -> storage.delete(user, a.getId()));
        kits.delete(k);
    }

    private BrandKit owned(AuthUser user, Long id) {
        return kits.findById(id).filter(k -> k.getOwner().getId().equals(user.id())).orElseThrow(() -> ApiException.notFound("Brand kit"));
    }

    private void apply(BrandKit k, BrandRequest req) {
        k.setName(req.name().trim());
        k.setColors(req.colors() == null ? "[]" : req.colors().toString());
        k.setFonts(req.fonts() == null ? "[]" : req.fonts().toString());
        k.setGuidelines(req.guidelines());
    }

    private BrandDto dto(BrandKit k) {
        return new BrandDto(k.getId(), k.getName(), json(k.getColors()), json(k.getFonts()), k.getGuidelines(),
                storage.forBrandKit(k.getId()));
    }

    private JsonNode json(String raw) {
        try {
            return mapper.readTree(raw == null ? "[]" : raw);
        } catch (JsonProcessingException e) {
            return mapper.createArrayNode();
        }
    }
}
