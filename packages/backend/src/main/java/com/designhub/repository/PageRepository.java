package com.designhub.repository;

import com.designhub.domain.Page;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PageRepository extends JpaRepository<Page, String> {
    List<Page> findByProjectIdOrderByPositionAsc(Long projectId);

    @Query("select p from Page p join fetch p.project where p.id in :ids")
    List<Page> findWithProject(@Param("ids") List<String> ids);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Page p where p.project.id = :pid")
    void deleteAllByProject(@Param("pid") Long projectId);
}
