package com.example.calendaronline.budget.api;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import com.example.calendaronline.budget.service.BudgetEngine;
import com.example.calendaronline.budget.service.BudgetEventMapper;
import com.example.calendaronline.budget.service.BudgetEventPublisher;
import com.example.calendaronline.budget.service.MovementRetentionService;
import com.example.calendaronline.budget.service.MonthlyCloseService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import com.example.calendaronline.budget.persistence.CategoryLimitEntity;
import com.example.calendaronline.budget.persistence.CategoryLimitRepository;
import com.example.calendaronline.budget.persistence.SavingsGoalEntity;
import com.example.calendaronline.budget.persistence.SavingsGoalRepository;
import com.example.calendaronline.budget.persistence.SavingsGoalTransactionEntity;
import com.example.calendaronline.budget.persistence.SavingsGoalTransactionRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {

    private final BudgetEventPublisher publisher;
    private final BudgetEngine budgetEngine;
    private final BudgetEventRepository budgetEventRepository;
    private final MonthlyCloseService monthlyCloseService;
    private final MovementRetentionService movementRetentionService;
    private final SavingsGoalRepository savingsGoalRepository;
    private final CategoryLimitRepository categoryLimitRepository;
    private final SavingsGoalTransactionRepository savingsGoalTransactionRepository;

    public BudgetController(BudgetEventPublisher publisher,
                            BudgetEngine budgetEngine,
                            BudgetEventRepository budgetEventRepository,
                            MonthlyCloseService monthlyCloseService,
                            MovementRetentionService movementRetentionService,
                            SavingsGoalRepository savingsGoalRepository,
                            CategoryLimitRepository categoryLimitRepository,
                            SavingsGoalTransactionRepository savingsGoalTransactionRepository) {
        this.publisher = publisher;
        this.budgetEngine = budgetEngine;
        this.budgetEventRepository = budgetEventRepository;
        this.monthlyCloseService = monthlyCloseService;
        this.movementRetentionService = movementRetentionService;
        this.savingsGoalRepository = savingsGoalRepository;
        this.categoryLimitRepository = categoryLimitRepository;
        this.savingsGoalTransactionRepository = savingsGoalTransactionRepository;
    }

    @PostMapping("/incomes")
    public Map<String, String> addIncome(@Valid @RequestBody MoneyRequest request, Principal principal) {
        publishMoneyEvent(BudgetEventType.INCOME, request, principal);
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/incomes/{id}")
    public Map<String, String> removeIncome(@PathVariable String id, Principal principal) {
        deleteEntry(id, BudgetEventType.INCOME, principal.getName());
        return Map.of("status", "deleted");
    }

    @PostMapping("/expenses")
    public Map<String, String> addExpense(@Valid @RequestBody MoneyRequest request, Principal principal) {
        publishMoneyEvent(BudgetEventType.EXPENSE, request, principal);
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/expenses/{id}")
    public Map<String, String> removeExpense(@PathVariable String id, Principal principal) {
        deleteEntry(id, BudgetEventType.EXPENSE, principal.getName());
        return Map.of("status", "deleted");
    }

    @PostMapping("/subscriptions")
    public Map<String, String> addSubscription(@RequestBody SubscriptionRequest request, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.SUBSCRIPTION_ADDED, request.amount(), request.label(),
            LocalDate.now(), null, null, "Abbonamenti"
        ));
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/subscriptions/{label}")
    public Map<String, String> removeSubscription(@PathVariable String label, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.SUBSCRIPTION_REMOVED, null, label,
            LocalDate.now(), null, null, "Abbonamenti"
        ));
        return Map.of("status", "accepted");
    }

    @PostMapping("/flexia")
    public Map<String, String> setFlexia(@RequestBody FlexiaRequest request, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.FLEXIA_SET, request.amount(), "Flexia",
            LocalDate.now(), request.yearMonth(), null, "Flexia"
        ));
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/flexia/{yearMonth}")
    public Map<String, String> removeFlexia(@PathVariable String yearMonth, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.FLEXIA_REMOVED, null, "Flexia rimossa",
            LocalDate.now(), yearMonth, null, "Flexia"
        ));
        return Map.of("status", "accepted");
    }

    @PostMapping("/debts")
    public Map<String, String> addDebt(@RequestBody DebtRequest request, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.DEBT_CREATED, request.totalAmount(), request.label(),
            LocalDate.now(), request.startMonth(), request.durationMonths(), "Debiti"
        ));
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/debts/{label}")
    public Map<String, String> removeDebt(@PathVariable String label, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.DEBT_REMOVED, null, label,
            LocalDate.now(), null, null, "Debiti"
        ));
        return Map.of("status", "accepted");
    }

    @PostMapping("/monthly-close")
    public Map<String, String> closeMonthLegacy() {
        // Endpoint mantenuto per compatibilità ma non più esposto nella UI.
        return Map.of("status", "noop");
    }

    /**
     * Elimina tutti gli eventi MONTHLY_CLOSE dell'utente corrente.
     * Usare per ripulire le chiusure mese precedenti che gonfiavano il saldo.
     */
    @DeleteMapping("/monthly-close")
    public Map<String, String> purgeMonthlyCloses(Principal principal) {
        int deleted = budgetEventRepository.deleteByUsernameAndType(
            principal.getName(), BudgetEventType.MONTHLY_CLOSE
        );
        return Map.of("status", "deleted", "count", String.valueOf(deleted));
    }

    @GetMapping("/dashboard")
    public DashboardSnapshot dashboard(Principal principal) {
        movementRetentionService.purgeExpiredMovements(principal.getName());
        monthlyCloseService.ensureCurrentMonthClosed(principal.getName());
        reconcileSavingsGoals(principal.getName());
        return budgetEngine.snapshot(
            budgetEventRepository.findByUsernameOrderByEventDateAscIdAsc(principal.getName()).stream()
                .map(BudgetEventMapper::toModel)
                .toList()
        );
    }

    private void reconcileSavingsGoals(String username) {
        List<SavingsGoalEntity> goals = savingsGoalRepository.findByUsernameOrderByCreatedAtDesc(username);
        for (SavingsGoalEntity goal : goals) {
            List<SavingsGoalTransactionEntity> list = savingsGoalTransactionRepository.findBySavingsGoalIdOrderByCreatedAtDesc(goal.getId());
            BigDecimal totalTxAmount = list.stream()
                .filter(t -> t.getAmount() != null)
                .map(SavingsGoalTransactionEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (totalTxAmount.compareTo(BigDecimal.ZERO) < 0) {
                totalTxAmount = BigDecimal.ZERO;
            }

            BigDecimal currentAmt = goal.getCurrentAmount() != null ? goal.getCurrentAmount() : BigDecimal.ZERO;

            if (totalTxAmount.compareTo(currentAmt) > 0) {
                goal.setCurrentAmount(totalTxAmount);
                savingsGoalRepository.save(goal);
                currentAmt = totalTxAmount;
            }

            BigDecimal missingAmount = currentAmt.subtract(totalTxAmount);
            if (missingAmount.compareTo(BigDecimal.ZERO) > 0) {
                String eventId = UUID.randomUUID().toString();
                publisher.publish(new BudgetEvent(
                    eventId, username,
                    BudgetEventType.EXPENSE, missingAmount, "Deposito salvadanaio: " + goal.getName(),
                    LocalDate.now(), null, null, "Salvadanaio"
                ));

                SavingsGoalTransactionEntity initTx = new SavingsGoalTransactionEntity(
                    goal.getId(), username, missingAmount, "Versamento Iniziale", eventId
                );
                savingsGoalTransactionRepository.save(initTx);
            }
        }
    }

    private void publishMoneyEvent(BudgetEventType type, MoneyRequest request, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            type, request.amount(), request.description(),
            request.date() == null ? LocalDate.now() : request.date(),
            null, null,
            request.category() != null && !request.category().isBlank() ? request.category() : "Altro"
        ));
    }

    private void deleteEntry(String id, BudgetEventType expectedType, String username) {
        BudgetEventEntity entity = budgetEventRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Voce non trovata"));
        if (!entity.getUsername().equals(username)) {
            throw new IllegalArgumentException("Non autorizzato");
        }
        if (entity.getType() != expectedType) {
            throw new IllegalArgumentException("Tipo voce non corrispondente");
        }
        budgetEventRepository.deleteById(id);
    }

    // --- SAVINGS GOALS ---
    @GetMapping("/savings-goals")
    public List<SavingsGoalEntity> getSavingsGoals(Principal principal) {
        reconcileSavingsGoals(principal.getName());
        return savingsGoalRepository.findByUsernameOrderByCreatedAtDesc(principal.getName());
    }

    @PostMapping("/savings-goals")
    public SavingsGoalEntity createSavingsGoal(@Valid @RequestBody SavingsGoalRequest request, Principal principal) {
        SavingsGoalEntity goal = new SavingsGoalEntity();
        goal.setUsername(principal.getName());
        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setTargetDate(request.targetDate());
        if (request.icon() != null && !request.icon().isBlank()) {
            goal.setIcon(request.icon());
        }
        return savingsGoalRepository.save(goal);
    }

    @PutMapping("/savings-goals/{id}")
    public SavingsGoalEntity updateSavingsGoal(@PathVariable String id, @Valid @RequestBody SavingsGoalRequest request, Principal principal) {
        SavingsGoalEntity goal = savingsGoalRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Obiettivo non trovato"));
        if (!goal.getUsername().equals(principal.getName())) {
            throw new IllegalArgumentException("Non autorizzato");
        }
        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setTargetDate(request.targetDate());
        if (request.icon() != null && !request.icon().isBlank()) {
            goal.setIcon(request.icon());
        }
        return savingsGoalRepository.save(goal);
    }

    @DeleteMapping("/savings-goals/{id}")
    public Map<String, String> deleteSavingsGoal(@PathVariable String id, Principal principal) {
        SavingsGoalEntity goal = savingsGoalRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Obiettivo non trovato"));
        if (!goal.getUsername().equals(principal.getName())) {
            throw new IllegalArgumentException("Non autorizzato");
        }
        savingsGoalTransactionRepository.deleteBySavingsGoalId(id);
        savingsGoalRepository.deleteById(id);
        return Map.of("status", "deleted");
    }

    @PostMapping("/savings-goals/{id}/deposit")
    public SavingsGoalEntity depositSavingsGoal(@PathVariable String id, @Valid @RequestBody DepositRequest request, Principal principal) {
        SavingsGoalEntity goal = savingsGoalRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Obiettivo non trovato"));
        if (!goal.getUsername().equals(principal.getName())) {
            throw new IllegalArgumentException("Non autorizzato");
        }

        if (request.amount().compareTo(BigDecimal.ZERO) == 0) {
            return goal;
        }

        BigDecimal updated = goal.getCurrentAmount().add(request.amount());
        if (updated.compareTo(BigDecimal.ZERO) < 0) {
            updated = BigDecimal.ZERO;
        }
        goal.setCurrentAmount(updated);

        String eventId = UUID.randomUUID().toString();
        // Deduct from or add to overall budget balance
        if (request.amount().compareTo(BigDecimal.ZERO) > 0) {
            publisher.publish(new BudgetEvent(
                eventId, principal.getName(),
                BudgetEventType.EXPENSE, request.amount(), "Deposito salvadanaio: " + goal.getName(),
                LocalDate.now(), null, null, "Salvadanaio"
            ));
        } else if (request.amount().compareTo(BigDecimal.ZERO) < 0) {
            publisher.publish(new BudgetEvent(
                eventId, principal.getName(),
                BudgetEventType.INCOME, request.amount().abs(), "Prelievo salvadanaio: " + goal.getName(),
                LocalDate.now(), null, null, "Salvadanaio"
            ));
        }

        String note = request.amount().compareTo(BigDecimal.ZERO) > 0 ? "Versamento quota" : "Prelievo quota";
        savingsGoalTransactionRepository.save(new SavingsGoalTransactionEntity(
            goal.getId(), principal.getName(), request.amount(), note, eventId
        ));

        return savingsGoalRepository.save(goal);
    }

    @GetMapping("/savings-goals/{id}/transactions")
    public List<SavingsGoalTransactionEntity> getSavingsGoalTransactions(@PathVariable String id, Principal principal) {
        SavingsGoalEntity goal = savingsGoalRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Obiettivo non trovato"));
        if (!goal.getUsername().equals(principal.getName())) {
            throw new IllegalArgumentException("Non autorizzato");
        }

        List<SavingsGoalTransactionEntity> list = savingsGoalTransactionRepository.findBySavingsGoalIdOrderByCreatedAtDesc(id);

        List<SavingsGoalTransactionEntity> activeList = list.stream()
            .filter(t -> t.getAmount() != null && t.getAmount().compareTo(BigDecimal.ZERO) != 0)
            .collect(Collectors.toList());

        BigDecimal totalTxAmount = activeList.stream()
            .map(SavingsGoalTransactionEntity::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal missingAmount = goal.getCurrentAmount().subtract(totalTxAmount);

        if (missingAmount.compareTo(BigDecimal.ZERO) > 0) {
            String eventId = UUID.randomUUID().toString();
            publisher.publish(new BudgetEvent(
                eventId, principal.getName(),
                BudgetEventType.EXPENSE, missingAmount, "Deposito salvadanaio: " + goal.getName(),
                LocalDate.now(), null, null, "Salvadanaio"
            ));

            SavingsGoalTransactionEntity initTx = new SavingsGoalTransactionEntity(
                id, principal.getName(), missingAmount, "Versamento Iniziale", eventId
            );
            savingsGoalTransactionRepository.save(initTx);

            activeList = savingsGoalTransactionRepository.findBySavingsGoalIdOrderByCreatedAtDesc(id).stream()
                .filter(t -> t.getAmount() != null && t.getAmount().compareTo(BigDecimal.ZERO) != 0)
                .collect(Collectors.toList());
        }

        return activeList;
    }

    @DeleteMapping("/savings-goals/{id}/transactions/{txId}")
    public Map<String, String> deleteSavingsGoalTransaction(@PathVariable String id, @PathVariable String txId, Principal principal) {
        SavingsGoalEntity goal = savingsGoalRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Obiettivo non trovato"));
        if (!goal.getUsername().equals(principal.getName())) {
            throw new IllegalArgumentException("Non autorizzato");
        }
        SavingsGoalTransactionEntity tx = savingsGoalTransactionRepository.findById(txId)
            .orElseThrow(() -> new IllegalArgumentException("Transazione non trovata"));

        // Reverse the deposit from currentAmount
        BigDecimal newAmount = goal.getCurrentAmount().subtract(tx.getAmount());
        if (newAmount.compareTo(BigDecimal.ZERO) < 0) {
            newAmount = BigDecimal.ZERO;
        }
        goal.setCurrentAmount(newAmount);
        savingsGoalRepository.save(goal);

        // Reverse from budget event & currentBalance if eventId exists
        if (tx.getEventId() != null) {
            budgetEventRepository.deleteById(tx.getEventId());
        } else {
            // Counter event to adjust currentBalance if eventId was null
            if (tx.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                publisher.publish(new BudgetEvent(
                    UUID.randomUUID().toString(), principal.getName(),
                    BudgetEventType.INCOME, tx.getAmount(), "Storno versamento: " + goal.getName(),
                    LocalDate.now(), null, null, "Salvadanaio"
                ));
            } else if (tx.getAmount().compareTo(BigDecimal.ZERO) < 0) {
                publisher.publish(new BudgetEvent(
                    UUID.randomUUID().toString(), principal.getName(),
                    BudgetEventType.EXPENSE, tx.getAmount().abs(), "Annullamento prelievo: " + goal.getName(),
                    LocalDate.now(), null, null, "Salvadanaio"
                ));
            }
        }

        savingsGoalTransactionRepository.deleteById(txId);
        return Map.of("status", "deleted");
    }

    @PutMapping("/savings-goals/{id}/transactions/{txId}")
    public SavingsGoalTransactionEntity updateSavingsGoalTransaction(@PathVariable String id, @PathVariable String txId, @Valid @RequestBody TransactionUpdateRequest request, Principal principal) {
        SavingsGoalEntity goal = savingsGoalRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Obiettivo non trovato"));
        if (!goal.getUsername().equals(principal.getName())) {
            throw new IllegalArgumentException("Non autorizzato");
        }
        SavingsGoalTransactionEntity tx = savingsGoalTransactionRepository.findById(txId)
            .orElseThrow(() -> new IllegalArgumentException("Transazione non trovata"));

        BigDecimal oldAmount = tx.getAmount();
        BigDecimal newAmount = request.amount();
        BigDecimal delta = newAmount.subtract(oldAmount);

        BigDecimal updatedGoalAmount = goal.getCurrentAmount().add(delta);
        if (updatedGoalAmount.compareTo(BigDecimal.ZERO) < 0) {
            updatedGoalAmount = BigDecimal.ZERO;
        }
        goal.getCurrentAmount();
        goal.setCurrentAmount(updatedGoalAmount);
        savingsGoalRepository.save(goal);

        tx.setAmount(newAmount);
        if (request.note() != null && !request.note().isBlank()) {
            tx.setNote(request.note());
        }
        savingsGoalTransactionRepository.save(tx);

        // Adjust main budget balance for the delta difference
        if (delta.compareTo(BigDecimal.ZERO) > 0) {
            publisher.publish(new BudgetEvent(
                UUID.randomUUID().toString(), principal.getName(),
                BudgetEventType.EXPENSE, delta, "Modifica versamento salvadanaio: " + goal.getName(),
                LocalDate.now(), null, null, "Salvadanaio"
            ));
        } else if (delta.compareTo(BigDecimal.ZERO) < 0) {
            publisher.publish(new BudgetEvent(
                UUID.randomUUID().toString(), principal.getName(),
                BudgetEventType.INCOME, delta.abs(), "Modifica versamento salvadanaio: " + goal.getName(),
                LocalDate.now(), null, null, "Salvadanaio"
            ));
        }

        return tx;
    }

    // --- CATEGORY LIMITS ---
    @GetMapping("/category-limits")
    public List<CategoryLimitEntity> getCategoryLimits(Principal principal) {
        return categoryLimitRepository.findByUsername(principal.getName());
    }

    @PostMapping("/category-limits")
    public CategoryLimitEntity setCategoryLimit(@Valid @RequestBody CategoryLimitRequest request, Principal principal) {
        String username = principal.getName();
        CategoryLimitEntity limit = categoryLimitRepository.findByUsernameAndCategory(username, request.category())
            .orElseGet(() -> new CategoryLimitEntity(username, request.category(), request.monthlyLimit()));
        limit.setMonthlyLimit(request.monthlyLimit());
        limit.setUpdatedAt(java.time.LocalDateTime.now());
        return categoryLimitRepository.save(limit);
    }

    // --- CATEGORY SUMMARY ---
    @GetMapping("/categories/summary")
    public Map<String, Object> getCategorySummary(Principal principal) {
        String currentYearMonth = java.time.YearMonth.now().toString();
        List<BudgetEventEntity> events = budgetEventRepository.findByUsernameOrderByEventDateAscIdAsc(principal.getName());
        
        Map<String, BigDecimal> expensesByCategory = events.stream()
            .filter(e -> e.getType() == BudgetEventType.EXPENSE)
            .filter(e -> e.getEventDate() != null && java.time.YearMonth.from(e.getEventDate()).toString().equals(currentYearMonth))
            .collect(Collectors.groupingBy(
                BudgetEventEntity::getCategory,
                Collectors.reducing(BigDecimal.ZERO, BudgetEventEntity::getAmount, BigDecimal::add)
            ));

        Map<String, BigDecimal> limitsByCategory = categoryLimitRepository.findByUsername(principal.getName()).stream()
            .collect(Collectors.toMap(CategoryLimitEntity::getCategory, CategoryLimitEntity::getMonthlyLimit, (a, b) -> b));

        return Map.of(
            "currentMonth", currentYearMonth,
            "expensesByCategory", expensesByCategory,
            "limitsByCategory", limitsByCategory
        );
    }

    // --- CASHFLOW FORECAST ---
    @GetMapping("/forecast")
    public Map<String, Object> getForecast(Principal principal) {
        DashboardSnapshot snap = dashboard(principal);
        BigDecimal currentBalance = snap.currentBalance();

        // Calculate average monthly income & expense from history
        BigDecimal monthlyIncome = snap.monthlyIncomes().values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthlyExpense = snap.monthlyExpenses().values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long incomeMonths = Math.max(1, snap.monthlyIncomes().size());
        long expenseMonths = Math.max(1, snap.monthlyExpenses().size());

        BigDecimal avgMonthlyIncome = monthlyIncome.divide(BigDecimal.valueOf(incomeMonths), 2, RoundingMode.HALF_UP);
        BigDecimal avgMonthlyExpense = monthlyExpense.divide(BigDecimal.valueOf(expenseMonths), 2, RoundingMode.HALF_UP);
        BigDecimal netMonthlyChange = avgMonthlyIncome.subtract(avgMonthlyExpense).subtract(snap.monthlySubscriptionsTotal());

        BigDecimal forecast3m = currentBalance.add(netMonthlyChange.multiply(BigDecimal.valueOf(3)));
        BigDecimal forecast6m = currentBalance.add(netMonthlyChange.multiply(BigDecimal.valueOf(6)));
        BigDecimal forecast12m = currentBalance.add(netMonthlyChange.multiply(BigDecimal.valueOf(12)));

        return Map.of(
            "currentBalance", currentBalance,
            "avgMonthlyIncome", avgMonthlyIncome,
            "avgMonthlyExpense", avgMonthlyExpense,
            "subscriptionsTotal", snap.monthlySubscriptionsTotal(),
            "netMonthlyChange", netMonthlyChange,
            "forecast3Months", forecast3m,
            "forecast6Months", forecast6m,
            "forecast12Months", forecast12m
        );
    }
}

record TransactionUpdateRequest(
    @jakarta.validation.constraints.NotNull BigDecimal amount,
    String note
) {}



