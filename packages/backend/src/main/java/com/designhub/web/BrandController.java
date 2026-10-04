package com.designhub.web;

import com.designhub.security.AuthUser;
import com.designhub.service.BrandService;
import com.designhub.service.BrandService.BrandDto;
import com.designhub.service.BrandService.BrandRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/brand")
@RequiredArgsConstructor
public class BrandController {
    private final BrandService brand;

    @GetMapping
    public List<BrandDto> list(@AuthenticationPrincipal AuthUser user) {
        return brand.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BrandDto create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody BrandRequest req) {
        return brand.create(user, req);
    }

    @PutMapping("/{id}")
    public BrandDto update(@AuthenticationPrincipal AuthUser user, @PathVariable Long id, @Valid @RequestBody BrandRequest req) {
        return brand.update(user, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        brand.delete(user, id);
    }
}
