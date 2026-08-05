package com.example.calendaronline.budget;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.service.BudgetEngine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BudgetEngineTest {

    @Test
    void monthlyCloseSubtractsDebtsFlexiaAndSubscriptions() {
        BudgetEngine engine = new BudgetEngine();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.INCOME, new BigDecimal("2500"), "Stipendio", LocalDate.now(), null, null, null),
            new BudgetEvent("2", "mario", BudgetEventType.EXPENSE, new BigDecimal("300"), "Spesa alimentare", LocalDate.now(), null, null, null),
            new BudgetEvent("3", "mario", BudgetEventType.SUBSCRIPTION_ADDED, new BigDecimal("20"), "Netflix", LocalDate.now(), null, null, null),
            new BudgetEvent("4", "mario", BudgetEventType.FLEXIA_SET, new BigDecimal("100"), "Flexia", LocalDate.now(), "2026-06", null, null),
            new BudgetEvent("5", "mario", BudgetEventType.DEBT_CREATED, new BigDecimal("1200"), "Monopola", LocalDate.now(), "2026-06", 6, null),
            new BudgetEvent("6", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), "2026-06", null, null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("880.00");
        assertThat(snapshot.flexiaByMonth()).doesNotContainKey("2026-06");
        assertThat(snapshot.debts()).hasSize(1);
        assertThat(snapshot.debts().get(0).remaining()).isEqualByComparingTo("6000.00");
    }

    @Test
    void debtEndingInCurrentMonthIsRemovedFromActiveDebtsAfterMonthlyClose() {
        BudgetEngine engine = new BudgetEngine();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.INCOME, new BigDecimal("1000"), "Stipendio", LocalDate.now(), null, null, null),
            new BudgetEvent("2", "mario", BudgetEventType.DEBT_CREATED, new BigDecimal("150"), "Prestito breve", LocalDate.now(), "2026-12", 1, null),
            new BudgetEvent("3", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), "2026-12", null, null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("850.00");
        assertThat(snapshot.debts()).isEmpty();
    }

    @Test
    void removedDebtIsNotChargedOnMonthlyClose() {
        BudgetEngine engine = new BudgetEngine();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.INCOME, new BigDecimal("2500"), "Stipendio", LocalDate.now(), null, null, null),
            new BudgetEvent("2", "mario", BudgetEventType.DEBT_CREATED, new BigDecimal("120"), "Carta", LocalDate.now(), "2026-06", 12, null),
            new BudgetEvent("3", "mario", BudgetEventType.DEBT_REMOVED, null, "Carta", LocalDate.now(), null, null, null),
            new BudgetEvent("4", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), "2026-06", null, null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("2500.00");
        assertThat(snapshot.debts()).isEmpty();
    }

    @Test
    void removedFlexiaIsNotShownAndNotCharged() {
        BudgetEngine engine = new BudgetEngine();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.INCOME, new BigDecimal("1000"), "Stipendio", LocalDate.now(), null, null, null),
            new BudgetEvent("2", "mario", BudgetEventType.FLEXIA_SET, new BigDecimal("150"), "Flexia", LocalDate.now(), "2026-06", null, null),
            new BudgetEvent("3", "mario", BudgetEventType.FLEXIA_REMOVED, null, "Flexia rimossa", LocalDate.now(), "2026-06", null, null),
            new BudgetEvent("4", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), "2026-06", null, null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("1000.00");
        assertThat(snapshot.flexiaByMonth()).doesNotContainKey("2026-06");
    }

    @Test
    void carryoverPreservesBalanceWhenOldMovementsDisappear() {
        BudgetEngine engine = new BudgetEngine();
        LocalDate oldDate = LocalDate.now().minusDays(40);
        List<BudgetEvent> events = List.of(
            new BudgetEvent("carry", "mario", BudgetEventType.BALANCE_CARRYOVER, new BigDecimal("680"), "Saldo consolidato", oldDate, null, null, null),
            new BudgetEvent("recent-expense", "mario", BudgetEventType.EXPENSE, new BigDecimal("80"), "Cena", LocalDate.now(), null, null, null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("600.00");
    }

    @Test
    void currentMonthCloseFlagIsTrueWhenCurrentMonthWasClosed() {
        BudgetEngine engine = new BudgetEngine();
        String currentMonth = YearMonth.now().toString();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), currentMonth, null, null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentMonthClosed()).isTrue();
    }

    @Test
    void debtsFromPastMonthAreHiddenInActiveDebtList() {
        BudgetEngine engine = new BudgetEngine();
        String previousMonth = YearMonth.now().minusMonths(1).toString();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.DEBT_CREATED, new BigDecimal("100"), "Debito vecchio", LocalDate.now(), previousMonth, 1, null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.debts()).isEmpty();
    }

    @Test
    void julyMonthlyCloseConsumesJuneFlexiaIfJulyFlexiaMissing() {
        BudgetEngine engine = new BudgetEngine();
        String currentMonth = YearMonth.now().toString();
        String previousMonth = YearMonth.now().minusMonths(1).toString();
        List<BudgetEvent> events = List.of(
            new BudgetEvent("1", "mario", BudgetEventType.INCOME, new BigDecimal("1000"), "Stipendio", LocalDate.now(), null, null, null),
            new BudgetEvent("2", "mario", BudgetEventType.FLEXIA_SET, new BigDecimal("120"), "Flexia", LocalDate.now(), previousMonth, null, null),
            new BudgetEvent("3", "mario", BudgetEventType.MONTHLY_CLOSE, null, "Close", LocalDate.now(), currentMonth, null, null)
        );

        DashboardSnapshot snapshot = engine.snapshot(events);
        assertThat(snapshot.currentBalance()).isEqualByComparingTo("880.00");
        assertThat(snapshot.flexiaByMonth()).doesNotContainKey(previousMonth);
    }
}

