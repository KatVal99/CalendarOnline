package com.example.calendaronline.budget.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BudgetEvent(
    String eventId,
    String username,
    BudgetEventType type,
    BigDecimal amount,
    String description,
    LocalDate eventDate,
    String yearMonth,
    Integer durationMonths
) {
}

