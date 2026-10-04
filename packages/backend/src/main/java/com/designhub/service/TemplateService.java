package com.designhub.service;

import com.designhub.domain.Access;
import com.designhub.domain.Category;
import com.designhub.domain.Template;
import com.designhub.dto.DesignDtos.DesignDto;
import com.designhub.exception.ApiException;
import com.designhub.repository.CategoryRepository;
import com.designhub.repository.TemplateRepository;
import com.designhub.repository.UserRepository;
import com.designhub.security.AuthUser;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TemplateService {
    private final TemplateRepository templates;
    private final CategoryRepository categories;
    private final UserRepository users;
    private final AccessService access;
    private final DesignService design;

    public record CategoryDto(Long id, String name, String slug, int width, int height) {}

    public record TemplateDto(Long id, String title, Long categoryId, String categoryName, int width, int height,
                              String thumbnail, String tags) {}

    public record TemplatePage(List<TemplateDto> items, long total) {}

    @Transactional(readOnly = true)
    public List<CategoryDto> categories() {
        return categories.findAllByOrderBySortOrderAsc().stream()
                .map(c -> new CategoryDto(c.getId(), c.getName(), c.getSlug(), c.getWidth(), c.getHeight())).toList();
    }

    @Transactional(readOnly = true)
    public TemplatePage search(Long categoryId, String q, int page, int size) {
        var result = templates.search(categoryId == null ? 0 : categoryId, q == null ? "" : q.trim(),
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 60))));
        return new TemplatePage(result.getContent().stream().map(this::dto).toList(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DesignDto design(Long id) {
        return design.deserialize(templates.findById(id).orElseThrow(() -> ApiException.notFound("Template")).getDesign());
    }

    /** Publishes the caller's own design as a reusable template. */
    @Transactional
    public TemplateDto publish(AuthUser user, Long projectId, String title, Long categoryId, String tags, String thumbnail) {
        var project = access.require(projectId, user, Access.OWNER).project();
        Template t = new Template();
        t.setTitle(title.trim());
        t.setAuthor(users.getReferenceById(user.id()));
        if (categoryId != null) t.setCategory(categories.findById(categoryId).orElseThrow(() -> ApiException.notFound("Category")));
        t.setWidth(project.getWidth());
        t.setHeight(project.getHeight());
        t.setTags(tags);
        t.setThumbnail(thumbnail != null ? thumbnail : project.getThumbnail());
        t.setDesign(design.serialize(design.load(project)));
        templates.save(t);
        return dto(t);
    }

    private TemplateDto dto(Template t) {
        Category c = t.getCategory();
        return new TemplateDto(t.getId(), t.getTitle(), c == null ? null : c.getId(), c == null ? null : c.getName(),
                t.getWidth(), t.getHeight(), t.getThumbnail(), t.getTags());
    }
}
