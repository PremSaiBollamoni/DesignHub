package com.designhub.repository;

import com.designhub.domain.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("select u from User u where lower(u.email) like lower(concat('%', :q, '%')) or lower(u.name) like lower(concat('%', :q, '%'))")
    List<User> search(@Param("q") String q, Pageable pageable);
}
