package com.example.calendaronline.budget.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record DashboardSnapshot(
    BigDecimal currentBalance,
    BigDecimal monthlySubscriptionsTotal,
    List<Subscription> subscriptions,
    List<DebtView> debts,
    Map<String, BigDecimal> flexiaByMonth,
    Map<String, BigDecimal> monthlyIncomes,
    Map<String, BigDecimal> monthlyExpenses,
    List<LedgerEntry> latestEntries,
    boolean currentMonthClosed
) {
}

