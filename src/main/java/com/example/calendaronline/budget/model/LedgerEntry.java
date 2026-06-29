package com.example.calendaronline.budget.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LedgerEntry(
    String eventId,
    LocalDate date,
    String description,
    BigDecimal delta,
    BigDecimal balanceAfter,
    BudgetEventType source
) {
}

