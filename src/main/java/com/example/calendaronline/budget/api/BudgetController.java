package com.example.calendaronline.budget.api;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import com.example.calendaronline.budget.service.BudgetEngine;
import com.example.calendaronline.budget.service.BudgetEventMapper;
import com.example.calendaronline.budget.service.BudgetEventPublisher;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {

    private final BudgetEventPublisher publisher;
    private final BudgetEngine budgetEngine;
    private final BudgetEventRepository budgetEventRepository;

    public BudgetController(BudgetEventPublisher publisher,
                            BudgetEngine budgetEngine,
                            BudgetEventRepository budgetEventRepository) {
        this.publisher = publisher;
        this.budgetEngine = budgetEngine;
        this.budgetEventRepository = budgetEventRepository;
    }

    @PostMapping("/incomes")
    public Map<String, String> addIncome(@RequestBody MoneyRequest request, Principal principal) {
        publishMoneyEvent(BudgetEventType.INCOME, request, principal);
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/incomes/{id}")
    public Map<String, String> removeIncome(@PathVariable String id, Principal principal) {
        deleteEntry(id, BudgetEventType.INCOME, principal.getName());
        return Map.of("status", "deleted");
    }

    @PostMapping("/expenses")
    public Map<String, String> addExpense(@RequestBody MoneyRequest request, Principal principal) {
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
            LocalDate.now(), null, null
        ));
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/subscriptions/{label}")
    public Map<String, String> removeSubscription(@PathVariable String label, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.SUBSCRIPTION_REMOVED, null, label,
            LocalDate.now(), null, null
        ));
        return Map.of("status", "accepted");
    }

    @PostMapping("/flexia")
    public Map<String, String> setFlexia(@RequestBody FlexiaRequest request, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.FLEXIA_SET, request.amount(), "Flexia",
            LocalDate.now(), request.yearMonth(), null
        ));
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/flexia/{yearMonth}")
    public Map<String, String> removeFlexia(@PathVariable String yearMonth, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.FLEXIA_REMOVED, null, "Flexia rimossa",
            LocalDate.now(), yearMonth, null
        ));
        return Map.of("status", "accepted");
    }

    @PostMapping("/debts")
    public Map<String, String> addDebt(@RequestBody DebtRequest request, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.DEBT_CREATED, request.totalAmount(), request.label(),
            LocalDate.now(), request.startMonth(), request.durationMonths()
        ));
        return Map.of("status", "accepted");
    }

    @DeleteMapping("/debts/{label}")
    public Map<String, String> removeDebt(@PathVariable String label, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            BudgetEventType.DEBT_REMOVED, null, label,
            LocalDate.now(), null, null
        ));
        return Map.of("status", "accepted");
    }

    @PostMapping("/monthly-close")
    public Map<String, String> closeMonthLegacy(@RequestBody MonthlyCloseRequest request, Principal principal) {
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
        return budgetEngine.snapshot(
            budgetEventRepository.findByUsernameOrderByEventDateAscIdAsc(principal.getName()).stream()
                .map(BudgetEventMapper::toModel)
                .toList()
        );
    }

    private void publishMoneyEvent(BudgetEventType type, MoneyRequest request, Principal principal) {
        publisher.publish(new BudgetEvent(
            UUID.randomUUID().toString(), principal.getName(),
            type, request.amount(), request.description(),
            request.date() == null ? LocalDate.now() : request.date(),
            null, null
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


