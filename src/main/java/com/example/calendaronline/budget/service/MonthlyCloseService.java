package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetDefaults;
import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

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

        // Clean up any duplicate MONTHLY_CLOSE events for this month
        List<BudgetEventEntity> existing = budgetEventRepository.findByUsernameAndTypeAndYearMonth(
            username, BudgetEventType.MONTHLY_CLOSE, month.toString()
        );
        if (existing.size() > 1) {
            // Keep only the first one, delete the rest
            List<String> duplicateIds = existing.subList(1, existing.size()).stream()
                .map(BudgetEventEntity::getId)
                .toList();
            budgetEventRepository.deleteAllByIdIn(duplicateIds);
        }

        boolean alreadyClosed = !existing.isEmpty();
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
            null,
            BudgetDefaults.CATEGORY_MONTHLY_CLOSE
        );
        budgetEventRepository.save(BudgetEventMapper.toEntity(event));
        monthlyReportEmailService.sendMonthlyReport(username, month);
        return true;
    }

    private String buildMonthlyCloseId(String username, YearMonth month) {
        return "monthly-close-" + username + "-" + month;
    }
}

