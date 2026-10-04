package com.designhub.repository;

import com.designhub.domain.Team;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<Team, Long> {
    @Query("select distinct t from Team t where t.owner.id = :uid or t.id in (select m.team.id from TeamMember m where m.user.id = :uid) order by t.name")
    List<Team> findForUser(@Param("uid") Long uid);
}
