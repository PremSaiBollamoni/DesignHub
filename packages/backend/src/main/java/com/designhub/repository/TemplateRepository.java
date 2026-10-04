package com.designhub.repository;

import com.designhub.domain.Template;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TemplateRepository extends JpaRepository<Template, Long> {
    @Query("""
            select t from Template t where t.published = true
              and (:categoryId = 0 or t.category.id = :categoryId)
              and (:q = '' or lower(t.title) like lower(concat('%', :q, '%')) or lower(t.tags) like lower(concat('%', :q, '%')))
            order by t.createdAt desc
            """)
    Page<Template> search(@Param("categoryId") long categoryId, @Param("q") String q, Pageable pageable);
}
