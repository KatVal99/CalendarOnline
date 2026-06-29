package com.example.calendaronline.budget.api;

import java.math.BigDecimal;

public record DebtRequest(
    String label,
    BigDecimal totalAmount,
    String startMonth,
    Integer durationMonths
) {
}

