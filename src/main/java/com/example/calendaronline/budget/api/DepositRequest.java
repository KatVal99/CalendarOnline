package com.example.calendaronline.budget.api;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DepositRequest(
    @NotNull(message = "L'importo e obbligatorio")
    BigDecimal amount
) {}
