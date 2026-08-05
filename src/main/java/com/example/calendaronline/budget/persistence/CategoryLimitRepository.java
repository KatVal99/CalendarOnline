package com.example.calendaronline.budget.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryLimitRepository extends JpaRepository<CategoryLimitEntity, String> {
    List<CategoryLimitEntity> findByUsername(String username);
    Optional<CategoryLimitEntity> findByUsernameAndCategory(String username, String category);
}
