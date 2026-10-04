package com.designhub.repository;

import com.designhub.domain.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("""
            select p from Project p
            where (p.owner.id = :uid
                   or p.id in (select c.project.id from Collaborator c where c.user.id = :uid)
                   or p.team.id in (select m.team.id from TeamMember m where m.user.id = :uid))
              and ((:trashed = true and p.deletedAt is not null) or (:trashed = false and p.deletedAt is null))
              and (:q = '' or lower(p.title) like lower(concat('%', :q, '%')))
              and (:folderId = 0 or p.folder.id = :folderId)
              and (:favorites = false or p.id in (select f.project.id from Favorite f where f.user.id = :uid))
              and (:sharedOnly = false or p.owner.id <> :uid)
            """)
    Page<Project> findAccessible(@Param("uid") Long uid, @Param("q") String q, @Param("trashed") boolean trashed,
                                 @Param("folderId") long folderId, @Param("favorites") boolean favorites,
                                 @Param("sharedOnly") boolean sharedOnly, Pageable pageable);

    long countByOwnerIdAndDeletedAtIsNull(Long ownerId);

    /** Bumps the revision without loading the entity; returns the new revision via {@link #revisionOf}. */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @Query("update Project p set p.revision = p.revision + 1, p.updatedAt = :now where p.id = :id")
    void touch(@Param("id") Long id, @Param("now") java.time.Instant now);

    default void touch(Long id) {
        touch(id, java.time.Instant.now());
    }

    @Query("select p.revision from Project p where p.id = :id")
    long revisionOf(@Param("id") Long id);
}
