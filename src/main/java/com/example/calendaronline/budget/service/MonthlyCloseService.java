package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;

@Service
public class MonthlyCloseService {

    private final BudgetEventRepository budgetEventRepository;
    private final MonthlyReportEmailService monthlyReportEmailService;

    public MonthlyCloseService(BudgetEventRepository budgetEventRepository,
                               MonthlyReportEmailService monthlyReportEmailService) {
        this.budgetEventRepository = budgetEventRepository;
        this.monthlyReportEmailService = monthlyReportEmailService;
    }

    public boolean ensureCurrentMonthClosed(String username) {
        return ensureMonthClosed(username, LocalDate.now());
    }

    public boolean ensureMonthClosed(String username, LocalDate referenceDate) {
        if (username == null || username.isBlank() || referenceDate == null) {
            return false;
        }

        YearMonth month = YearMonth.from(referenceDate);
        boolean alreadyClosed = budgetEventRepository.existsByUsernameAndTypeAndYearMonth(
            username,
            BudgetEventType.MONTHLY_CLOSE,
            month.toString()
        );
        if (alreadyClosed) {
            return false;
        }

        BudgetEvent event = new BudgetEvent(
            buildMonthlyCloseId(username, month),
            username,
            BudgetEventType.MONTHLY_CLOSE,
            null,
            "Chiusura automatica",
            month.atDay(1),
            month.toString(),
            null
        );
        budgetEventRepository.save(BudgetEventMapper.toEntity(event));
        monthlyReportEmailService.sendMonthlyReport(username, month);
        return true;
    }

    private String buildMonthlyCloseId(String username, YearMonth month) {
        return "monthly-close-" + username + "-" + month;
    }
}

