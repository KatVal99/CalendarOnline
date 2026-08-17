package com.example.calendaronline.budget.api;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record TransactionUpdateRequest(
    @NotNull(message = "L'importo è obbligatorio") BigDecimal amount,
    String note
) {
}
