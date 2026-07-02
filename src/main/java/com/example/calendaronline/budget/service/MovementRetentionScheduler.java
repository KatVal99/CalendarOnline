package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MovementRetentionScheduler {

    private final BudgetEventRepository budgetEventRepository;
    private final MovementRetentionService movementRetentionService;

    public MovementRetentionScheduler(BudgetEventRepository budgetEventRepository,
                                      MovementRetentionService movementRetentionService) {
        this.budgetEventRepository = budgetEventRepository;
        this.movementRetentionService = movementRetentionService;
    }

    @Scheduled(cron = "0 15 1 * * *")
    public void purgeExpiredMovements() {
        for (String username : budgetEventRepository.findDistinctUsernames()) {
            movementRetentionService.purgeExpiredMovements(username);
        }
    }
}

