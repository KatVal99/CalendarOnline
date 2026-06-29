package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

@Component
public class MonthlyCloseScheduler {

    private final BudgetEventPublisher publisher;
    private final BudgetEventRepository budgetEventRepository;
    private final MonthlyReportEmailService monthlyReportEmailService;

    public MonthlyCloseScheduler(BudgetEventPublisher publisher,
                                 BudgetEventRepository budgetEventRepository,
                                 MonthlyReportEmailService monthlyReportEmailService) {
        this.publisher = publisher;
        this.budgetEventRepository = budgetEventRepository;
        this.monthlyReportEmailService = monthlyReportEmailService;
    }

    @Scheduled(cron = "0 5 0 * * *")
    public void closeAtDayOne() {
        LocalDate now = LocalDate.now();
        if (now.getDayOfMonth() != 1) {
            return;
        }

        YearMonth month = YearMonth.from(now);
        for (String username : budgetEventRepository.findDistinctUsernames()) {
            boolean alreadyClosed = budgetEventRepository.existsByUsernameAndTypeAndYearMonth(
                username,
                BudgetEventType.MONTHLY_CLOSE,
                month.toString()
            );
            if (alreadyClosed) {
                continue;
            }

            publisher.publish(new BudgetEvent(
                "monthly-close-" + month + "-" + UUID.randomUUID(),
                username,
                BudgetEventType.MONTHLY_CLOSE,
                null,
                "Chiusura automatica",
                now,
                month.toString(),
                null
            ));
            monthlyReportEmailService.sendMonthlyReport(username, month);
        }
    }
}

