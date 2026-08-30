package com.example.calendaronline.budget.api;

import com.example.calendaronline.budget.model.BudgetDefaults;
import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import com.example.calendaronline.budget.persistence.CategoryLimitEntity;
import com.example.calendaronline.budget.persistence.CategoryLimitRepository;
import com.example.calendaronline.budget.persistence.SavingsGoalEntity;
import com.example.calendaronline.budget.persistence.SavingsGoalTransactionEntity;
import com.example.calendaronline.budget.service.BudgetEngine;
import com.example.calendaronline.budget.service.BudgetEventMapper;
import com.example.calendaronline.budget.service.BudgetEventPublisher;
import com.example.calendaronline.budget.service.BudgetForecastService;
import com.example.calendaronline.budget.service.MonthlyCloseService;
import com.example.calendaronline.budget.service.MovementRetentionService;
import com.example.calendaronline.budget.service.SavingsGoalService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {

    private final BudgetEventPublisher publisher;
    private final BudgetEngine budgetEngine;
    private final BudgetEventRepository budgetEventRepository;
    private final MonthlyCloseService monthlyCloseService;
    private final MovementRetentionService movementRetentionService;
    private final CategoryLimitRepository categoryLimitRepository;
    private final SavingsGoalService savingsGoalService;
    private final BudgetForecastService budgetForecastService;

    public BudgetController(BudgetEventPublisher publisher,
                            BudgetEngine budgetEngine,
                            BudgetEventRepository budgetEventRepository,
                            MonthlyCloseService monthlyCloseService,
                            MovementRetentionService movementRetentionService,
                            CategoryLimitRepository categoryLimitRepository,
                            SavingsGoalService savingsGoalService,
                            BudgetForecastService budgetForecastService) {
        this.publisher = publisher;
        this.budgetEngine = budgetEngine;
        this.budgetEventRepository = budgetEventRepository;
        this.monthlyCloseService = monthlyCloseService;
        this.movementRetentionService = movementRetentionService;
        this.categoryLimitRepository = categoryLimitRepository;
        this.savingsGoalService = savingsGoalService;
        this.budgetForecastService = budgetForecastService;
    }

    // --- INCOMES & EXPENSES ---

    @PostMapping("/incomes")
    public Map<String, String> addIncome(@Valid @RequestBody MoneyRequest request, Principal principal) {
        publishMoneyEvent(BudgetEventType.INCOME, request, principal.getName());
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/incomes/{id}")
    public Map<String, String> removeIncome(@PathVariable String id, Principal principal) {
        deleteEntry(id, BudgetEventType.INCOME, principal.getName());
        return Map.of("status", "deleted");
    }

    @PostMapping("/expenses")
    public Map<String, String> addExpense(@Valid @RequestBody MoneyRequest request, Principal principal) {
        publishMoneyEvent(BudgetEventType.EXPENSE, request, principal.getName());
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/expenses/{id}")
    public Map<String, String> removeExpense(@PathVariable String id, Principal principal) {
        deleteEntry(id, BudgetEventType.EXPENSE, principal.getName());
        return Map.of("status", "deleted");
    }

    // --- SUBSCRIPTIONS ---

    @PostMapping("/subscriptions")
    public Map<String, String> addSubscription(@RequestBody SubscriptionRequest request, Principal principal) {
        String username = principal.getName();
        String label = request.label() != null ? request.label().trim() : "";
        if (label.isBlank()) {
            return Map.of("status", "invalid_label");
        }
        // Remove any old events for this label first to avoid duplicate events
        budgetEventRepository.deleteSubscriptionEventsByUsernameAndLabel(username, label);
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), username,
            BudgetEventType.SUBSCRIPTION_ADDED, request.amount(), label,
            LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SUBSCRIPTIONS
        ));
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/subscriptions/{label}")
    public Map<String, String> removeSubscription(@PathVariable String label, Principal principal) {
        String username = principal.getName();
        budgetEventRepository.deleteSubscriptionEventsByUsernameAndLabel(username, label);
        return Map.of("status", "deleted");
    }

    // --- FLEXIA ---

    @PostMapping("/flexia")
    public Map<String, String> setFlexia(@RequestBody FlexiaRequest request, Principal principal) {
        String username = principal.getName();
        budgetEventRepository.deleteFlexiaEventsByUsernameAndYearMonth(username, request.yearMonth());
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), username,
            BudgetEventType.FLEXIA_SET, request.amount(), BudgetDefaults.DESC_FLEXIA_DEFAULT,
            LocalDate.now(), request.yearMonth(), null, BudgetDefaults.CATEGORY_FLEXIA
        ));
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/flexia/{yearMonth}")
    public Map<String, String> removeFlexia(@PathVariable String yearMonth, Principal principal) {
        String username = principal.getName();
        budgetEventRepository.deleteFlexiaEventsByUsernameAndYearMonth(username, yearMonth);
        return Map.of("status", "deleted");
    }

    // --- DEBTS ---

    @PostMapping("/debts")
    public Map<String, String> addDebt(@RequestBody DebtRequest request, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.DEBT_CREATED, request.totalAmount(), request.label(),
            LocalDate.now(), request.startMonth(), request.durationMonths(), BudgetDefaults.CATEGORY_DEBTS
        ));
        return Map.of("status", "accepted");
    }

    @PutMapping("/debts/{oldLabel}")
    public Map<String, String> updateDebt(@PathVariable String oldLabel, @RequestBody DebtRequest request, Principal principal) {
        String username = principal.getName();
        budgetEventRepository.deleteDebtEventsByUsernameAndLabel(username, oldLabel);
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), username,
            BudgetEventType.DEBT_CREATED, request.totalAmount(), request.label(),
            LocalDate.now(), request.startMonth(), request.durationMonths(), BudgetDefaults.CATEGORY_DEBTS
        ));
        return Map.of("status", "updated");
    }

    @DeleteMapping("/debts/{label}")
    public Map<String, String> removeDebt(@PathVariable String label, Principal principal) {
        String username = principal.getName();
        budgetEventRepository.deleteDebtEventsByUsernameAndLabel(username, label);
        return Map.of("status", "accepted");
    }

    // --- MONTHLY CLOSE ---

    @PostMapping("/monthly-close")
    public Map<String, String> closeMonthLegacy() {
        return Map.of("status", "noop");
    }

    @DeleteMapping("/monthly-close")
    public Map<String, String> purgeMonthlyCloses(Principal principal) {
        int deleted = budgetEventRepository.deleteByUsernameAndType(
            principal.getName(), BudgetEventType.MONTHLY_CLOSE
        );
        return Map.of("status", "deleted", "count", String.valueOf(deleted));
    }

    // --- DASHBOARD ---

    @GetMapping("/dashboard")
    public DashboardSnapshot dashboard(Principal principal) {
        String username = principal.getName();
        movementRetentionService.purgeExpiredMovements(username);
        monthlyCloseService.ensureCurrentMonthClosed(username);
        savingsGoalService.reconcileSavingsGoals(username);

        List<BudgetEvent> events = budgetEventRepository.findByUsernameOrderByEventDateAscIdAsc(username).stream()
            .map(BudgetEventMapper::toModel)
            .toList();

        return budgetEngine.snapshot(events);
    }

    // --- SAVINGS GOALS ---

    @GetMapping("/savings-goals")
    public List<SavingsGoalEntity> getSavingsGoals(Principal principal) {
        return savingsGoalService.getSavingsGoals(principal.getName());
    }

    @PostMapping("/savings-goals")
    public SavingsGoalEntity createSavingsGoal(@Valid @RequestBody SavingsGoalRequest request, Principal principal) {
        return savingsGoalService.createSavingsGoal(principal.getName(), request);
    }

    @PutMapping("/savings-goals/{id}")
    public SavingsGoalEntity updateSavingsGoal(@PathVariable String id,
                                               @Valid @RequestBody SavingsGoalRequest request,
                                               Principal principal) {
        return savingsGoalService.updateSavingsGoal(principal.getName(), id, request);
    }

    @DeleteMapping("/savings-goals/{id}")
    public Map<String, String> deleteSavingsGoal(@PathVariable String id, Principal principal) {
        savingsGoalService.deleteSavingsGoal(principal.getName(), id);
        return Map.of("status", "deleted");
    }

    @PostMapping("/savings-goals/{id}/deposit")
    public SavingsGoalEntity depositSavingsGoal(@PathVariable String id,
                                                @Valid @RequestBody DepositRequest request,
                                                Principal principal) {
        return savingsGoalService.depositSavingsGoal(principal.getName(), id, request.amount());
    }

    @GetMapping("/savings-goals/{id}/transactions")
    public List<SavingsGoalTransactionEntity> getSavingsGoalTransactions(@PathVariable String id, Principal principal) {
        return savingsGoalService.getSavingsGoalTransactions(principal.getName(), id);
    }

    @DeleteMapping("/savings-goals/{id}/transactions/{txId}")
    public Map<String, String> deleteSavingsGoalTransaction(@PathVariable String id,
                                                            @PathVariable String txId,
                                                            Principal principal) {
        savingsGoalService.deleteSavingsGoalTransaction(principal.getName(), id, txId);
        return Map.of("status", "deleted");
    }

    @PutMapping("/savings-goals/{id}/transactions/{txId}")
    public SavingsGoalTransactionEntity updateSavingsGoalTransaction(@PathVariable String id,
                                                                    @PathVariable String txId,
                                                                    @Valid @RequestBody TransactionUpdateRequest request,
                                                                    Principal principal) {
        return savingsGoalService.updateSavingsGoalTransaction(principal.getName(), id, txId, request);
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
        limit.setUpdatedAt(LocalDateTime.now());
        return categoryLimitRepository.save(limit);
    }

    @DeleteMapping("/category-limits/{category}")
    public Map<String, String> deleteCategoryLimit(@PathVariable String category, Principal principal) {
        String username = principal.getName();
        categoryLimitRepository.findByUsernameAndCategory(username, category)
            .ifPresent(categoryLimitRepository::delete);
        return Map.of("status", "deleted");
    }

    // --- CATEGORY SUMMARY ---

    @GetMapping("/categories/summary")
    public Map<String, Object> getCategorySummary(Principal principal) {
        return budgetForecastService.getCategorySummary(principal.getName());
    }

    // --- CASHFLOW FORECAST ---

    @GetMapping("/forecast")
    public Map<String, Object> getForecast(Principal principal) {
        String username = principal.getName();
        List<BudgetEvent> events = budgetEventRepository.findByUsernameOrderByEventDateAscIdAsc(username).stream()
            .map(BudgetEventMapper::toModel)
            .toList();
        DashboardSnapshot snap = budgetEngine.snapshot(events);
        return budgetForecastService.calculateForecast(snap);
    }

    // --- PRIVATE HELPERS ---

    private void publishMoneyEvent(BudgetEventType type, MoneyRequest request, String username) {
        String category = request.category() != null && !request.category().isBlank()
            ? request.category()
            : BudgetDefaults.CATEGORY_OTHER;

        LocalDate date = request.date() == null ? LocalDate.now() : request.date();

        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), username,
            type, request.amount(), request.description(),
            date, null, null, category
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
}
