package com.designhub.repository;

import com.designhub.domain.Collaborator;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollaboratorRepository extends JpaRepository<Collaborator, Long> {
    List<Collaborator> findByProjectId(Long projectId);

    Optional<Collaborator> findByProjectIdAndUserId(Long projectId, Long userId);
}
