package com.example.calendaronline.budget.api;

import java.math.BigDecimal;

public record SubscriptionRequest(
    String label,
    BigDecimal amount
) {
}

