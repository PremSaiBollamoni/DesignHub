package com.designhub.repository;

import com.designhub.domain.TeamMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    List<TeamMember> findByTeamId(Long teamId);

    List<TeamMember> findByUserId(Long userId);

    @Query("select t from Team t where t.owner.id = :uid")
    List<com.designhub.domain.Team> ownedTeams(@Param("uid") Long uid);

    Optional<TeamMember> findByTeamIdAndUserId(Long teamId, Long userId);
}
