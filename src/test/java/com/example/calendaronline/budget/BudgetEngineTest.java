package com.example.calendaronline.budget;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.service.BudgetEngine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BudgetEngineTest {

    @Test
    void monthlyCloseSubtractsDebtsFlexiaAndSubscriptions() {
        BudgetEngine engine = new BudgetEngine();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.INCOME, new BigDecimal("2500"), "Stipendio", LocalDate.now(), null, null),
            new BudgetEvent("2", "mario", BudgetEventType.EXPENSE, new BigDecimal("300"), "Spesa alimentare", LocalDate.now(), null, null),
            new BudgetEvent("3", "mario", BudgetEventType.SUBSCRIPTION_ADDED, new BigDecimal("20"), "Netflix", LocalDate.now(), null, null),
            new BudgetEvent("4", "mario", BudgetEventType.FLEXIA_SET, new BigDecimal("100"), "Flexia", LocalDate.now(), "2026-06", null),
            new BudgetEvent("5", "mario", BudgetEventType.DEBT_CREATED, new BigDecimal("1200"), "Monopola", LocalDate.now(), "2026-06", 6),
            new BudgetEvent("6", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), "2026-06", null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("880.00");
        assertThat(snapshot.flexiaByMonth()).containsEntry("2026-06", new BigDecimal("100"));
        assertThat(snapshot.debts()).hasSize(1);
        assertThat(snapshot.debts().get(0).remaining()).isEqualByComparingTo("6000.00");
    }

    @Test
    void removedDebtIsNotChargedOnMonthlyClose() {
        BudgetEngine engine = new BudgetEngine();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.INCOME, new BigDecimal("2500"), "Stipendio", LocalDate.now(), null, null),
            new BudgetEvent("2", "mario", BudgetEventType.DEBT_CREATED, new BigDecimal("120"), "Carta", LocalDate.now(), "2026-06", 12),
            new BudgetEvent("3", "mario", BudgetEventType.DEBT_REMOVED, null, "Carta", LocalDate.now(), null, null),
            new BudgetEvent("4", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), "2026-06", null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("2500.00");
        assertThat(snapshot.debts()).isEmpty();
    }

    @Test
    void removedFlexiaIsNotShownAndNotCharged() {
        BudgetEngine engine = new BudgetEngine();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.INCOME, new BigDecimal("1000"), "Stipendio", LocalDate.now(), null, null),
            new BudgetEvent("2", "mario", BudgetEventType.FLEXIA_SET, new BigDecimal("150"), "Flexia", LocalDate.now(), "2026-06", null),
            new BudgetEvent("3", "mario", BudgetEventType.FLEXIA_REMOVED, null, "Flexia rimossa", LocalDate.now(), "2026-06", null),
            new BudgetEvent("4", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), "2026-06", null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("1000.00");
        assertThat(snapshot.flexiaByMonth()).doesNotContainKey("2026-06");
    }
}

