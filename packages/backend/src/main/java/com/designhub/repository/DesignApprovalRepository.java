package com.designhub.repository;

import com.designhub.domain.DesignApproval;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DesignApprovalRepository extends JpaRepository<DesignApproval, Long> {
    Optional<DesignApproval> findFirstByProjectIdOrderByIdDesc(Long projectId);

    @Query("select a from DesignApproval a where a.status = com.designhub.domain.DesignApproval.Status.PENDING and a.project.team.id in :teamIds and a.project.deletedAt is null order by a.id desc")
    List<DesignApproval> waitingInTeams(@Param("teamIds") List<Long> teamIds);

    List<DesignApproval> findByProjectIdAndStatus(Long projectId, DesignApproval.Status status);
}
