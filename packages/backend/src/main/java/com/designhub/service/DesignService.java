package com.designhub.service;

import com.designhub.domain.Element;
import com.designhub.domain.Page;
import com.designhub.domain.Project;
import com.designhub.dto.DesignDtos.*;
import com.designhub.exception.ApiException;
import com.designhub.repository.ElementRepository;
import com.designhub.repository.PageRepository;
import com.designhub.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Persistence for the design document (pages + elements). Authorization happens before calls in here. */
@Service
@RequiredArgsConstructor
public class DesignService {
    private final ProjectRepository projects;
    private final PageRepository pages;
    private final ElementRepository elements;
    private final ObjectMapper mapper;

    @Transactional(readOnly = true)
    public DesignDto load(Project p) {
        Map<String, List<ElementDto>> byPage = new HashMap<>();
        for (Element e : elements.findByProject(p.getId())) {
            byPage.computeIfAbsent(e.getPage().getId(), k -> new ArrayList<>())
                    .add(new ElementDto(e.getId(), e.getType(), e.getZIndex(), parse(e.getData())));
        }
        List<PageDto> out = pages.findByProjectIdOrderByPositionAsc(p.getId()).stream()
                .map(pg -> new PageDto(pg.getId(), pg.getName(), pg.getBackground(), pg.getDurationSeconds(), pg.getPosition(),
                        byPage.getOrDefault(pg.getId(), List.of()), pg.getNotes()))
                .toList();
        return new DesignDto(p.getId(), p.getRevision(), p.getWidth(), p.getHeight(), out);
    }

    /** Replaces the whole document. Ids are remapped when {@code remap} is true (templates, duplicates, restores from other designs). */
    @Transactional
    public void replace(Project p, DesignDto design, boolean remap) {
        DesignDto source = remap ? remapIds(design) : design;
        assertNoForeignIds(p.getId(), source);
        elements.deleteAllByProject(p.getId());
        pages.deleteAllByProject(p.getId());
        Project ref = projects.getReferenceById(p.getId());
        List<PageDto> list = source.pages() == null ? List.of() : source.pages();
        int position = 0;
        for (PageDto dto : list) {
            Page page = newPage(ref, dto, position++);
            pages.save(page);
            saveElements(page, dto.elements());
        }
        if (source.width() > 0 && source.height() > 0) {
            Project managed = projects.getReferenceById(p.getId());
            managed.setWidth(source.width());
            managed.setHeight(source.height());
        }
        projects.touch(p.getId());
    }

    /** Applies one persistence op and returns the new project revision. */
    @Transactional
    public long apply(Project p, DesignOp op) {
        switch (op.type()) {
            case "ELEMENTS_UPSERT" -> upsertElements(p, op);
            case "ELEMENTS_DELETE" -> {
                if (op.ids() != null && !op.ids().isEmpty()) elements.deleteByIdsInProject(op.ids(), p.getId());
            }
            case "PAGE_UPSERT" -> upsertPage(p, op.page());
            case "PAGE_DELETE" -> deletePage(p, op.pageId());
            case "PAGES_ORDER" -> reorder(p, op.order());
            case "PROJECT_SIZE" -> resize(p, op);
            default -> throw ApiException.badRequest("Unknown operation " + op.type());
        }
        projects.touch(p.getId());
        return projects.revisionOf(p.getId());
    }

    public String serialize(DesignDto dto) {
        try {
            return mapper.writeValueAsString(dto);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Design could not be serialised", e);
        }
    }

    public DesignDto deserialize(String json) {
        try {
            return mapper.readValue(json, DesignDto.class);
        } catch (JsonProcessingException e) {
            throw ApiException.badRequest("Stored design is unreadable");
        }
    }

    private void upsertElements(Project p, DesignOp op) {
        if (op.elements() == null || op.elements().isEmpty()) return;
        Page page = pages.findById(op.pageId()).filter(pg -> pg.getProject().getId().equals(p.getId()))
                .orElseThrow(() -> ApiException.notFound("Page"));
        List<String> ids = op.elements().stream().map(ElementDto::id).toList();
        Map<String, Element> existing = elements.findWithPage(ids).stream().collect(Collectors.toMap(Element::getId, e -> e));
        for (ElementDto dto : op.elements()) {
            Element e = existing.get(dto.id());
            if (e != null && !e.getPage().getProject().getId().equals(p.getId())) {
                throw ApiException.forbidden("Element belongs to another design");
            }
            if (e == null) {
                e = new Element();
                e.setId(dto.id());
            }
            e.setPage(page);
            fill(e, dto);
            elements.save(e);
        }
    }

    private void upsertPage(Project p, PageDto dto) {
        if (dto == null || dto.id() == null) throw ApiException.badRequest("Page id is required");
        Page page = pages.findById(dto.id()).orElse(null);
        if (page != null && !page.getProject().getId().equals(p.getId())) throw ApiException.forbidden("Page belongs to another design");
        if (page == null) {
            page = newPage(projects.getReferenceById(p.getId()), dto, dto.position());
            pages.save(page);
            if (dto.elements() != null) saveElements(page, dto.elements());
            return;
        }
        page.setName(dto.name());
        page.setBackground(dto.background());
        page.setDurationSeconds(dto.durationSeconds());
        page.setNotes(dto.notes());
    }

    private void deletePage(Project p, String pageId) {
        Page page = pages.findById(pageId).filter(pg -> pg.getProject().getId().equals(p.getId())).orElse(null);
        if (page == null) return;
        elements.deleteAllByPage(pageId);
        pages.delete(page);
    }

    private void reorder(Project p, List<String> order) {
        if (order == null) return;
        Map<String, Page> byId = pages.findByProjectIdOrderByPositionAsc(p.getId()).stream().collect(Collectors.toMap(Page::getId, x -> x));
        int pos = 0;
        for (String id : order) {
            Page pg = byId.get(id);
            if (pg != null) pg.setPosition(pos++);
        }
    }

    private void resize(Project p, DesignOp op) {
        if (op.width() == null || op.height() == null || op.width() < 16 || op.height() < 16 || op.width() > 16000 || op.height() > 16000) {
            throw ApiException.badRequest("Canvas size must be between 16 and 16000 pixels");
        }
        Project managed = projects.getReferenceById(p.getId());
        managed.setWidth(op.width());
        managed.setHeight(op.height());
    }

    private Page newPage(Project project, PageDto dto, int position) {
        Page page = new Page();
        page.setId(dto.id() == null ? UUID.randomUUID().toString() : dto.id());
        page.setProject(project);
        page.setPosition(position);
        page.setName(dto.name());
        page.setBackground(dto.background());
        page.setDurationSeconds(dto.durationSeconds());
        page.setNotes(dto.notes());
        return page;
    }

    private void saveElements(Page page, List<ElementDto> list) {
        if (list == null) return;
        List<Element> batch = new ArrayList<>(list.size());
        for (ElementDto dto : list) {
            Element e = new Element();
            e.setId(dto.id());
            e.setPage(page);
            fill(e, dto);
            batch.add(e);
        }
        elements.saveAll(batch);
    }

    private void fill(Element e, ElementDto dto) {
        e.setType(dto.type());
        e.setZIndex(dto.zIndex());
        e.setData(dto.data() == null ? "{}" : dto.data().toString());
    }

    private JsonNode parse(String json) {
        try {
            return mapper.readTree(json);
        } catch (JsonProcessingException ex) {
            return mapper.createObjectNode();
        }
    }

    private void assertNoForeignIds(Long projectId, DesignDto design) {
        if (design.pages() == null) return;
        List<String> pageIds = design.pages().stream().map(PageDto::id).filter(Objects::nonNull).toList();
        if (!pageIds.isEmpty() && pages.findWithProject(pageIds).stream().anyMatch(pg -> !pg.getProject().getId().equals(projectId))) {
            throw ApiException.forbidden("Page belongs to another design");
        }
        List<String> elementIds = design.pages().stream().flatMap(pg -> pg.elements() == null ? java.util.stream.Stream.<ElementDto>empty() : pg.elements().stream())
                .map(ElementDto::id).toList();
        if (!elementIds.isEmpty() && elements.findWithPage(elementIds).stream().anyMatch(e -> !e.getPage().getProject().getId().equals(projectId))) {
            throw ApiException.forbidden("Element belongs to another design");
        }
    }

    /** Fresh UUIDs for every page and element so copies never collide with the originals. */
    private DesignDto remapIds(DesignDto d) {
        List<PageDto> mapped = (d.pages() == null ? List.<PageDto>of() : d.pages()).stream().map(pg -> new PageDto(
                UUID.randomUUID().toString(), pg.name(), pg.background(), pg.durationSeconds(), pg.position(),
                (pg.elements() == null ? List.<ElementDto>of() : pg.elements()).stream()
                        .map(e -> new ElementDto(UUID.randomUUID().toString(), e.type(), e.zIndex(), e.data())).toList(), pg.notes())).toList();
        return new DesignDto(d.projectId(), d.revision(), d.width(), d.height(), mapped);
    }
}
