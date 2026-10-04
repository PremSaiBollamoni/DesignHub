package com.designhub.repository;

import com.designhub.domain.Element;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ElementRepository extends JpaRepository<Element, String> {
    @Query("select e from Element e join fetch e.page p where p.project.id = :pid order by p.position, e.zIndex")
    List<Element> findByProject(@Param("pid") Long projectId);

    @Query("select e from Element e join fetch e.page p where e.id in :ids")
    List<Element> findWithPage(@Param("ids") List<String> ids);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Element e where e.page.id in (select p.id from Page p where p.project.id = :pid)")
    void deleteAllByProject(@Param("pid") Long projectId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Element e where e.page.id = :pageId")
    void deleteAllByPage(@Param("pageId") String pageId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from Element e where e.id in :ids and e.page.id in (select p.id from Page p where p.project.id = :pid)")
    void deleteByIdsInProject(@Param("ids") List<String> ids, @Param("pid") Long projectId);
}
