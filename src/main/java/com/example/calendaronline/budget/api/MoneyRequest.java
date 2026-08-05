package com.example.calendaronline.budget.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public record MoneyRequest(
    @NotNull(message = "L'importo e obbligatorio")
    @Positive(message = "L'importo deve essere maggiore di zero")
    BigDecimal amount,

    @NotBlank(message = "La descrizione e obbligatoria")
    String description,

    LocalDate date,

    String category
) {
}

