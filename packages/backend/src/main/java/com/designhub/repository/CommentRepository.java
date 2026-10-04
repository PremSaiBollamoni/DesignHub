package com.designhub.repository;

import com.designhub.domain.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByProjectIdOrderByCreatedAtAsc(Long projectId);

    List<Comment> findByParentId(Long parentId);
}
