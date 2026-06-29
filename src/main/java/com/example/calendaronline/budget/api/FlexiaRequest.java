package com.example.calendaronline.budget.api;

import java.math.BigDecimal;

public record FlexiaRequest(
    String yearMonth,
    BigDecimal amount
) {
}

