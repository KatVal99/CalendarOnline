package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class MonthlyCloseScheduler {

    private final BudgetEventRepository budgetEventRepository;
    private final MonthlyCloseService monthlyCloseService;

    public MonthlyCloseScheduler(BudgetEventRepository budgetEventRepository,
                                 MonthlyCloseService monthlyCloseService) {
        this.budgetEventRepository = budgetEventRepository;
        this.monthlyCloseService = monthlyCloseService;
    }

    @Scheduled(cron = "0 5 * * * *")
    public void closeAtDayOne() {
        LocalDate now = LocalDate.now();
        if (now.getDayOfMonth() != 1) {
            return;
        }

        for (String username : budgetEventRepository.findDistinctUsernames()) {
            monthlyCloseService.ensureMonthClosed(username, now);
        }
    }
}

