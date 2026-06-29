package com.example.calendaronline.budget.model;

import java.math.BigDecimal;
import java.time.YearMonth;

public class DebtPlan {

    private final String label;
    private final YearMonth startMonth;
    private final YearMonth endMonth;
    private final BigDecimal monthlyInstallment;
    private BigDecimal remaining;

    public DebtPlan(String label, BigDecimal monthlyAmount, YearMonth startMonth, int durationMonths) {
        this.label = label;
        this.startMonth = startMonth;
        int safeDurationMonths = Math.max(1, durationMonths);
        this.endMonth = startMonth.plusMonths(safeDurationMonths - 1L);
        this.monthlyInstallment = monthlyAmount;
        this.remaining = monthlyAmount.multiply(BigDecimal.valueOf(safeDurationMonths));
    }

    public String label() {
        return label;
    }

    public YearMonth startMonth() {
        return startMonth;
    }

    public YearMonth endMonth() {
        return endMonth;
    }

    public BigDecimal remaining() {
        return remaining;
    }

    public BigDecimal monthlyInstallment() {
        return monthlyInstallment;
    }

    public boolean isActive(YearMonth month) {
        return !month.isBefore(startMonth) && !month.isAfter(endMonth) && remaining.compareTo(BigDecimal.ZERO) > 0;
    }

    public BigDecimal applyInstallment() {
        BigDecimal applied = remaining.min(monthlyInstallment);
        remaining = remaining.subtract(applied);
        return applied;
    }
}

