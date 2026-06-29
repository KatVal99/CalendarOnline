package com.example.calendaronline.budget.model;

import java.math.BigDecimal;

public record DebtView(
    String label,
    String startMonth,
    String endMonth,
    BigDecimal monthlyInstallment,
    BigDecimal remaining
) {
}

