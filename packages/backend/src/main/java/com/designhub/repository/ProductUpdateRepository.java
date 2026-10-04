package com.designhub.repository;

import com.designhub.domain.ProductUpdate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductUpdateRepository extends JpaRepository<ProductUpdate, Long> {
    List<ProductUpdate> findTop20ByOrderByCreatedAtDesc();
}
