package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.model.DebtPlan;
import com.example.calendaronline.budget.model.DebtView;
import com.example.calendaronline.budget.model.LedgerEntry;
import com.example.calendaronline.budget.model.Subscription;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

@Service
public class BudgetEngine {

    public DashboardSnapshot snapshot(List<BudgetEvent> events) {
        BigDecimal currentBalance = BigDecimal.ZERO;
        YearMonth currentMonth = YearMonth.now();
        List<LedgerEntry> ledgerEntries = new ArrayList<>();
        Map<String, Subscription> subscriptions = new LinkedHashMap<>();
        Map<String, DebtPlan> debtPlans = new LinkedHashMap<>();
        Map<YearMonth, BigDecimal> flexiaByMonth = new HashMap<>();
        Map<String, BigDecimal> monthlyIncomes = new LinkedHashMap<>();
        Map<String, BigDecimal> monthlyExpenses = new LinkedHashMap<>();
        Set<YearMonth> closedMonths = new HashSet<>();
        boolean currentMonthClosed = false;

        List<BudgetEvent> orderedEvents = events == null
            ? List.of()
            : events.stream()
            .sorted(Comparator.comparing(BudgetEvent::eventDate).thenComparing(BudgetEvent::eventId))
            .toList();

        for (BudgetEvent event : orderedEvents) {
            if (event == null || event.type() == null) {
                continue;
            }

            switch (event.type()) {
                case INCOME -> currentBalance = applyDelta(
                    currentBalance, ledgerEntries,
                    event.amount(), event.description(),
                    BudgetEventType.INCOME, event.eventDate(),
                    monthlyIncomes, monthlyExpenses, event.eventId()
                );
                case BALANCE_CARRYOVER -> currentBalance = applyCarryover(
                    currentBalance, ledgerEntries,
                    event.amount(), event.description(), event.eventDate(), event.eventId()
                );
                case EXPENSE -> currentBalance = applyDelta(
                    currentBalance, ledgerEntries,
                    event.amount().negate(), event.description(),
                    BudgetEventType.EXPENSE, event.eventDate(),
                    monthlyIncomes, monthlyExpenses, event.eventId()
                );
                case SUBSCRIPTION_ADDED -> subscriptions.put(event.description(), new Subscription(event.description(), event.amount()));
                case SUBSCRIPTION_REMOVED -> subscriptions.remove(event.description());
                case FLEXIA_SET -> flexiaByMonth.put(YearMonth.parse(event.yearMonth()), event.amount());
                case FLEXIA_REMOVED -> flexiaByMonth.remove(YearMonth.parse(event.yearMonth()));
                case DEBT_CREATED -> addDebt(event, debtPlans);
                case DEBT_REMOVED -> debtPlans.remove(event.description());
                case MONTHLY_CLOSE -> {
                    YearMonth closeYm = YearMonth.parse(event.yearMonth());
                    if (!closedMonths.contains(closeYm)) {
                        currentBalance = applyMonthlyClose(
                            currentBalance, closeYm,
                            ledgerEntries, subscriptions, debtPlans, flexiaByMonth,
                            monthlyIncomes, monthlyExpenses
                        );
                        closedMonths.add(closeYm);
                    }
                    currentMonthClosed = currentMonthClosed || YearMonth.now().toString().equals(event.yearMonth());
                }
                default -> { }
            }
        }

        BigDecimal subscriptionsTotal = subscriptions.values().stream()
            .map(Subscription::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Subscription> subscriptionList = subscriptions.values().stream().toList();

        List<DebtView> debts = debtPlans.values().stream()
            .filter(plan -> plan.isListedForCurrentMonth(currentMonth))
            .map(plan -> new DebtView(
                plan.label(), plan.startMonth().toString(), plan.endMonth().toString(),
                plan.monthlyInstallment(), plan.remaining(), plan.durationMonths()
            ))
            .toList();

        Map<String, BigDecimal> flexia = flexiaByMonth.entrySet().stream()
            .filter(entry -> !entry.getKey().isBefore(currentMonth))
            .sorted(Map.Entry.comparingByKey())
            .collect(LinkedHashMap::new, (acc, e) -> acc.put(e.getKey().toString(), e.getValue()), LinkedHashMap::putAll);

        List<LedgerEntry> latest = ledgerEntries.stream()
            .sorted(Comparator.comparing(LedgerEntry::date).reversed())
            .limit(50)
            .toList();

        return new DashboardSnapshot(currentBalance, subscriptionsTotal, subscriptionList, debts, flexia, monthlyIncomes, monthlyExpenses, latest, currentMonthClosed);
    }

    private void addDebt(BudgetEvent event, Map<String, DebtPlan> debtPlans) {
        YearMonth startMonth;
        try {
            startMonth = event.yearMonth() != null && !event.yearMonth().isBlank()
                ? YearMonth.parse(event.yearMonth())
                : YearMonth.from(event.eventDate() != null ? event.eventDate() : LocalDate.now());
        } catch (Exception e) {
            startMonth = YearMonth.from(event.eventDate() != null ? event.eventDate() : LocalDate.now());
        }
        int duration = event.durationMonths() != null ? event.durationMonths() : 1;
        DebtPlan plan = new DebtPlan(
            event.description(), event.amount(),
            startMonth, duration
        );
        debtPlans.put(event.description(), plan);
    }

    private BigDecimal applyMonthlyClose(BigDecimal currentBalance,
                                         YearMonth yearMonth,
                                         List<LedgerEntry> ledgerEntries,
                                         Map<String, Subscription> subscriptions,
                                         Map<String, DebtPlan> debtPlans,
                                         Map<YearMonth, BigDecimal> flexiaByMonth,
                                         Map<String, BigDecimal> monthlyIncomes,
                                         Map<String, BigDecimal> monthlyExpenses) {
        YearMonth flexiaMonthToCharge = resolveFlexiaMonthToCharge(flexiaByMonth, yearMonth);
        BigDecimal flexiaAmount = flexiaMonthToCharge == null
            ? BigDecimal.ZERO
            : flexiaByMonth.getOrDefault(flexiaMonthToCharge, BigDecimal.ZERO);
        if (flexiaAmount.compareTo(BigDecimal.ZERO) > 0) {
            currentBalance = applyDelta(currentBalance, ledgerEntries,
                flexiaAmount.negate(), "Flexia " + flexiaMonthToCharge,
                BudgetEventType.MONTHLY_CLOSE, yearMonth.atDay(1),
                monthlyIncomes, monthlyExpenses, null);
            flexiaByMonth.remove(flexiaMonthToCharge);
        }

        for (Subscription subscription : subscriptions.values()) {
            currentBalance = applyDelta(currentBalance, ledgerEntries,
                subscription.amount().negate(), "Abbonamento " + subscription.label() + " " + yearMonth,
                BudgetEventType.MONTHLY_CLOSE, yearMonth.atDay(1),
                monthlyIncomes, monthlyExpenses, null);
        }

        for (DebtPlan debtPlan : debtPlans.values()) {
            if (!debtPlan.shouldChargeIn(yearMonth)) {
                continue;
            }
            BigDecimal installment = debtPlan.applyInstallment();
            currentBalance = applyDelta(currentBalance, ledgerEntries,
                installment.negate(), "Debito " + debtPlan.label() + " " + yearMonth,
                BudgetEventType.MONTHLY_CLOSE, yearMonth.atDay(1),
                monthlyIncomes, monthlyExpenses, null);
        }

        debtPlans.entrySet().removeIf(entry -> entry.getValue().remaining().compareTo(BigDecimal.ZERO) <= 0);

        return currentBalance;
    }

    private YearMonth resolveFlexiaMonthToCharge(Map<YearMonth, BigDecimal> flexiaByMonth, YearMonth closeMonth) {
        if (flexiaByMonth.containsKey(closeMonth)) {
            return closeMonth;
        }
        return flexiaByMonth.keySet().stream()
            .filter(month -> !month.isAfter(closeMonth))
            .max(YearMonth::compareTo)
            .orElse(null);
    }

    private BigDecimal applyDelta(BigDecimal currentBalance,
                                  List<LedgerEntry> ledgerEntries,
                                  BigDecimal delta,
                                  String description,
                                  BudgetEventType source,
                                  LocalDate date,
                                  Map<String, BigDecimal> monthlyIncomes,
                                  Map<String, BigDecimal> monthlyExpenses,
                                  String eventId) {
        currentBalance = currentBalance.add(delta);
        YearMonth month = YearMonth.from(date == null ? LocalDate.now() : date);
        if (delta.compareTo(BigDecimal.ZERO) >= 0) {
            monthlyIncomes.merge(month.toString(), delta, BigDecimal::add);
        } else {
            monthlyExpenses.merge(month.toString(), delta.abs(), BigDecimal::add);
        }
        ledgerEntries.add(new LedgerEntry(
            eventId,
            date == null ? LocalDate.now() : date,
            description,
            delta,
            currentBalance,
            source
        ));
        return currentBalance;
    }

    private BigDecimal applyCarryover(BigDecimal currentBalance,
                                      List<LedgerEntry> ledgerEntries,
                                      BigDecimal delta,
                                      String description,
                                      LocalDate date,
                                      String eventId) {
        currentBalance = currentBalance.add(delta == null ? BigDecimal.ZERO : delta);
        ledgerEntries.add(new LedgerEntry(
            eventId,
            date == null ? LocalDate.now() : date,
            description,
            delta == null ? BigDecimal.ZERO : delta,
            currentBalance,
            BudgetEventType.BALANCE_CARRYOVER
        ));
        return currentBalance;
    }
}

