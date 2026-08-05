package com.example.calendaronline.budget.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingsGoalRequest(
    @NotBlank(message = "Il nome dell'obiettivo e obbligatorio")
    String name,

    @NotNull(message = "L'importo target e obbligatorio")
    @Positive(message = "L'importo target deve essere positivo")
    BigDecimal targetAmount,

    LocalDate targetDate,

    String icon
) {}
