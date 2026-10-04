package com.designhub.config;

import com.designhub.domain.Category;
import com.designhub.domain.Template;
import com.designhub.dto.DesignDtos.DesignDto;
import com.designhub.dto.DesignDtos.ElementDto;
import com.designhub.dto.DesignDtos.PageDto;
import com.designhub.repository.CategoryRepository;
import com.designhub.repository.TemplateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Starter layouts built from the same element model the editor uses, so they open and edit like any design. */
@Component
@RequiredArgsConstructor
public class TemplateSeeder {
    private final CategoryRepository categories;
    private final TemplateRepository templates;
    private final ObjectMapper mapper;
    private final TemplateThumbnailer thumbnailer;

    public void seed() {
        add("instagram-post", "Launch day", "launch,product,announcement", "#151515", w -> {
            w.rect(0, 0, 1080, 1080, "#151515", 0);
            w.ellipse(560, -160, 760, 760, "#FF5A36");
            w.ellipse(-120, 700, 520, 520, "#FFB547");
            w.text("We are live.", 90, 330, 900, 150, "Bricolage Grotesque", 800, "#F6F5F2");
            w.text("Our new collection is out today. Come take a look.", 90, 560, 720, 48, "Inter Tight", 400, "#F6F5F2");
        });
        add("instagram-post", "Quote of the week", "quote,minimal,text", "#F2EFE6", w -> {
            w.rect(60, 60, 960, 960, "#F2EFE6", 0);
            w.rect(90, 90, 900, 900, "#FFFFFF", 28);
            w.text("Good design is as little design as possible.", 150, 330, 780, 84, "Fraunces", 600, "#151515");
            w.text("Dieter Rams", 150, 760, 600, 40, "Inter Tight", 500, "#FF5A36");
        });
        add("instagram-story", "Sale ends tonight", "sale,promo,story", "#FF5A36", w -> {
            w.rect(0, 0, 1080, 1920, "#FF5A36", 0);
            w.ellipse(140, 520, 800, 800, "#FFB547");
            w.text("48 hours only", 90, 200, 900, 60, "Inter Tight", 600, "#FFFFFF");
            w.text("Up to 50% off", 90, 760, 900, 160, "Anton", 400, "#FFFFFF");
            w.text("Shop the sale", 90, 1560, 900, 64, "Bricolage Grotesque", 700, "#FFFFFF");
        });
        add("presentation", "Quarterly review", "business,report,slides", "#F6F5F2", w -> {
            w.rect(0, 0, 1920, 1080, "#F6F5F2", 0);
            w.rect(0, 0, 40, 1080, "#FF5A36", 0);
            w.text("Quarterly review", 180, 360, 1400, 150, "Bricolage Grotesque", 800, "#151515");
            w.text("What shipped, what we learned, and what comes next", 180, 560, 1200, 56, "Inter Tight", 400, "#4A4E57");
        });
        add("poster", "Open studio night", "event,poster,art", "#151515", w -> {
            w.rect(0, 0, 1587, 2245, "#FFB547", 0);
            w.ellipse(220, 420, 1150, 1150, "#151515");
            w.text("Open studio", 140, 1560, 1300, 190, "Anton", 400, "#151515");
            w.text("Friday 7 pm · Free entry", 140, 1860, 1300, 64, "Inter Tight", 600, "#151515");
        });
        add("youtube-thumbnail", "Big reveal", "video,thumbnail,bold", "#FFB547", w -> {
            w.rect(0, 0, 1280, 720, "#FFB547", 0);
            w.rect(70, 70, 700, 580, "#151515", 24);
            w.text("I rebuilt my desk setup", 110, 140, 620, 96, "Anton", 400, "#FFFFFF");
            w.text("and it changed everything", 110, 430, 620, 52, "Inter Tight", 600, "#FFB547");
        });
        add("linkedin-banner", "Hiring banner", "hiring,linkedin,business", "#151515", w -> {
            w.rect(0, 0, 1584, 396, "#151515", 0);
            w.rect(1180, 0, 404, 396, "#FF5A36", 0);
            w.text("We are hiring designers", 80, 110, 1000, 90, "Bricolage Grotesque", 800, "#F6F5F2");
            w.text("Join a small team building tools people love", 80, 240, 1000, 40, "Inter Tight", 400, "#F6F5F2");
        });
        add("pinterest-pin", "Weekly meal plan", "food,pin,lifestyle", "#F2EFE6", w -> {
            w.rect(0, 0, 1000, 1500, "#F2EFE6", 0);
            w.ellipse(150, 120, 700, 700, "#FFB547");
            w.text("A week of easy dinners", 80, 900, 840, 110, "Fraunces", 700, "#151515");
            w.text("Plan once, cook calmly", 80, 1240, 840, 44, "Inter Tight", 500, "#4A4E57");
        });
    }

    private void add(String slug, String title, String tags, String background, java.util.function.Consumer<Layout> build) {
        Category c = categories.findAll().stream().filter(x -> x.getSlug().equals(slug)).findFirst().orElseThrow();
        Layout layout = new Layout();
        build.accept(layout);
        PageDto page = new PageDto(UUID.randomUUID().toString(), "Page 1", background, null, 0, layout.elements, null);
        DesignDto design = new DesignDto(null, 0, c.getWidth(), c.getHeight(), List.of(page));
        Template t = new Template();
        t.setCategory(c);
        t.setTitle(title);
        t.setTags(tags);
        t.setWidth(c.getWidth());
        t.setHeight(c.getHeight());
        t.setThumbnail(thumbnailer.svg(design));
        try {
            t.setDesign(mapper.writeValueAsString(design));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        templates.save(t);
    }

    private final class Layout {
        final List<ElementDto> elements = new ArrayList<>();

        void rect(double x, double y, double w, double h, String fill, double radius) {
            shape("rect", x, y, w, h, fill, radius);
        }

        void ellipse(double x, double y, double w, double h, String fill) {
            shape("ellipse", x, y, w, h, fill, 0);
        }

        private void shape(String kind, double x, double y, double w, double h, String fill, double radius) {
            ObjectNode d = base(x, y, w, h);
            d.put("shape", kind).put("fill", fill).put("cornerRadius", radius).put("strokeWidth", 0);
            elements.add(new ElementDto(UUID.randomUUID().toString(), "shape", elements.size(), d));
        }

        void text(String text, double x, double y, double w, double size, String family, int weight, String fill) {
            ObjectNode d = base(x, y, w, size * 1.2);
            d.put("text", text).put("fontSize", size).put("fontFamily", family).put("fontWeight", weight).put("fill", fill)
                    .put("align", "left").put("lineHeight", 1.1);
            elements.add(new ElementDto(UUID.randomUUID().toString(), "text", elements.size(), d));
        }

        private ObjectNode base(double x, double y, double w, double h) {
            ObjectNode d = mapper.createObjectNode();
            d.put("x", x).put("y", y).put("width", w).put("height", h).put("rotation", 0).put("opacity", 1);
            return d;
        }
    }
}
