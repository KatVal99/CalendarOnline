package com.example.calendaronline.budget.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface CategoryLimitRepository extends JpaRepository<CategoryLimitEntity, String> {
    List<CategoryLimitEntity> findByUsername(String username);
    List<CategoryLimitEntity> findAllByUsernameAndCategory(String username, String category);

    @Transactional
    void deleteByUsernameAndCategory(String username, String category);
}
