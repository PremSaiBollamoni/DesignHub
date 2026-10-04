package com.designhub.repository;

import com.designhub.domain.Folder;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByOwnerIdOrderByNameAsc(Long ownerId);
}
