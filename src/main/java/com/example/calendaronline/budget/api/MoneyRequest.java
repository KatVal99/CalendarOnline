package com.example.calendaronline.budget.api;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MoneyRequest(
    BigDecimal amount,
    String description,
    LocalDate date
) {
}

