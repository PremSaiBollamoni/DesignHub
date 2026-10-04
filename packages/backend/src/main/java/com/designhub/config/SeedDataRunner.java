package com.designhub.config;

import com.designhub.domain.Category;
import com.designhub.domain.Plan;
import com.designhub.domain.ProductUpdate;
import com.designhub.repository.CategoryRepository;
import com.designhub.repository.PlanRepository;
import com.designhub.repository.ProductUpdateRepository;
import com.designhub.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Reference data the product cannot run without: plans, design categories, starter templates, release notes. */
@Slf4j
@Component
@RequiredArgsConstructor
public class SeedDataRunner implements CommandLineRunner {
    private static final long GB = 1024L * 1024 * 1024;

    private final PlanRepository plans;
    private final CategoryRepository categories;
    private final TemplateRepository templates;
    private final ProductUpdateRepository updates;
    private final TemplateSeeder templateSeeder;

    @Override
    @Transactional
    public void run(String... args) {
        if (plans.count() == 0) {
            plans.save(plan("free", "Free", 0, 10, GB, 20, 30, 1));
            plans.save(plan("pro", "Pro", 1200, 500, 50 * GB, 500, 1000, 5));
            plans.save(plan("team", "Team", 2900, 5000, 500 * GB, 5000, 10000, 50));
        }
        if (categories.count() == 0) {
            int order = 0;
            categories.save(category("Instagram post", "instagram-post", 1080, 1080, order++));
            categories.save(category("Instagram story", "instagram-story", 1080, 1920, order++));
            categories.save(category("Presentation", "presentation", 1920, 1080, order++));
            categories.save(category("Poster", "poster", 1587, 2245, order++));
            categories.save(category("YouTube thumbnail", "youtube-thumbnail", 1280, 720, order++));
            categories.save(category("Facebook cover", "facebook-cover", 1640, 624, order++));
            categories.save(category("LinkedIn banner", "linkedin-banner", 1584, 396, order++));
            categories.save(category("Pinterest pin", "pinterest-pin", 1000, 1500, order++));
            categories.save(category("A4 document", "a4-document", 1240, 1754, order));
        }
        if (templates.count() == 0) templateSeeder.seed();
        if (updates.count() == 0) {
            ProductUpdate u = new ProductUpdate();
            u.setTitle("Welcome to DesignHub");
            u.setBody("Design together in real time, keep every version, and publish straight to your social accounts.");
            updates.save(u);
        }
        log.info("Reference data ready");
    }

    private static Plan plan(String code, String name, int price, int projects, long storage, int ai, int exports, int seats) {
        Plan p = new Plan();
        p.setCode(code);
        p.setName(name);
        p.setPriceCents(price);
        p.setMaxProjects(projects);
        p.setStorageBytes(storage);
        p.setAiRequestsPerMonth(ai);
        p.setExportsPerMonth(exports);
        p.setTeamSeats(seats);
        return p;
    }

    private static Category category(String name, String slug, int w, int h, int order) {
        Category c = new Category();
        c.setName(name);
        c.setSlug(slug);
        c.setWidth(w);
        c.setHeight(h);
        c.setSortOrder(order);
        return c;
    }
}
