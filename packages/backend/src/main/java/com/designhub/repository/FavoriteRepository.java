package com.designhub.repository;

import com.designhub.domain.Favorite;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByUserIdAndProjectId(Long userId, Long projectId);

    @Query("select f.project.id from Favorite f where f.user.id = :uid and f.project.id in :ids")
    List<Long> favoriteIds(@Param("uid") Long uid, @Param("ids") List<Long> ids);
}
