package com.example.calendaronline.budget.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record CategoryLimitRequest(
    @NotBlank(message = "La categoria e obbligatoria")
    String category,

    @NotNull(message = "Il limite mensile e obbligatorio")
    @Positive(message = "Il limite deve essere maggiore di zero")
    BigDecimal monthlyLimit
) {}
