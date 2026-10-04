package com.designhub.repository;

import com.designhub.domain.Activity;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByProjectIdOrderByCreatedAtDesc(Long projectId, Pageable pageable);

    @Query("select a from Activity a where a.actor.id = :uid or a.project.id in (select p.id from Project p where p.owner.id = :uid) order by a.createdAt desc")
    List<Activity> findForUser(@Param("uid") Long uid, Pageable pageable);
}
