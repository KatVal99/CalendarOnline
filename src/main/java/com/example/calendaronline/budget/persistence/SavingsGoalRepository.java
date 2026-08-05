package com.example.calendaronline.budget.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoalEntity, String> {
    List<SavingsGoalEntity> findByUsernameOrderByCreatedAtDesc(String username);
}
