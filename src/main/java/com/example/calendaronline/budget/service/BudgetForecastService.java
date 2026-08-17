package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import com.example.calendaronline.budget.persistence.CategoryLimitEntity;
import com.example.calendaronline.budget.persistence.CategoryLimitRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BudgetForecastService {

    private final BudgetEventRepository budgetEventRepository;
    private final CategoryLimitRepository categoryLimitRepository;

    public BudgetForecastService(BudgetEventRepository budgetEventRepository,
                                 CategoryLimitRepository categoryLimitRepository) {
        this.budgetEventRepository = budgetEventRepository;
        this.categoryLimitRepository = categoryLimitRepository;
    }

    public Map<String, Object> getCategorySummary(String username) {
        String currentYearMonth = YearMonth.now().toString();
        List<BudgetEventEntity> events = budgetEventRepository.findByUsernameOrderByEventDateAscIdAsc(username);

        Map<String, BigDecimal> expensesByCategory = events.stream()
            .filter(e -> e.getType() == BudgetEventType.EXPENSE)
            .filter(e -> e.getEventDate() != null && YearMonth.from(e.getEventDate()).toString().equals(currentYearMonth))
            .collect(Collectors.groupingBy(
                BudgetEventEntity::getCategory,
                Collectors.reducing(BigDecimal.ZERO, BudgetEventEntity::getAmount, BigDecimal::add)
            ));

        Map<String, BigDecimal> limitsByCategory = categoryLimitRepository.findByUsername(username).stream()
            .collect(Collectors.toMap(CategoryLimitEntity::getCategory, CategoryLimitEntity::getMonthlyLimit, (a, b) -> b));

        return Map.of(
            "currentMonth", currentYearMonth,
            "expensesByCategory", expensesByCategory,
            "limitsByCategory", limitsByCategory
        );
    }

    public Map<String, Object> calculateForecast(DashboardSnapshot snapshot) {
        BigDecimal currentBalance = snapshot.currentBalance();

        BigDecimal monthlyIncome = snapshot.monthlyIncomes().values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthlyExpense = snapshot.monthlyExpenses().values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long incomeMonths = Math.max(1, snapshot.monthlyIncomes().size());
        long expenseMonths = Math.max(1, snapshot.monthlyExpenses().size());

        BigDecimal avgMonthlyIncome = monthlyIncome.divide(BigDecimal.valueOf(incomeMonths), 2, RoundingMode.HALF_UP);
        BigDecimal avgMonthlyExpense = monthlyExpense.divide(BigDecimal.valueOf(expenseMonths), 2, RoundingMode.HALF_UP);
        BigDecimal netMonthlyChange = avgMonthlyIncome.subtract(avgMonthlyExpense).subtract(snapshot.monthlySubscriptionsTotal());

        BigDecimal forecast3m = currentBalance.add(netMonthlyChange.multiply(BigDecimal.valueOf(3)));
        BigDecimal forecast6m = currentBalance.add(netMonthlyChange.multiply(BigDecimal.valueOf(6)));
        BigDecimal forecast12m = currentBalance.add(netMonthlyChange.multiply(BigDecimal.valueOf(12)));

        return Map.of(
            "currentBalance", currentBalance,
            "avgMonthlyIncome", avgMonthlyIncome,
            "avgMonthlyExpense", avgMonthlyExpense,
            "subscriptionsTotal", snapshot.monthlySubscriptionsTotal(),
            "netMonthlyChange", netMonthlyChange,
            "forecast3Months", forecast3m,
            "forecast6Months", forecast6m,
            "forecast12Months", forecast12m
        );
    }
}
