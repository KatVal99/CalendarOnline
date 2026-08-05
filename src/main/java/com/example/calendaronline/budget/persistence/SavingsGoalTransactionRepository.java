package com.example.calendaronline.budget.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavingsGoalTransactionRepository extends JpaRepository<SavingsGoalTransactionEntity, String> {
    List<SavingsGoalTransactionEntity> findBySavingsGoalIdOrderByCreatedAtDesc(String savingsGoalId);
    void deleteBySavingsGoalId(String savingsGoalId);
}
