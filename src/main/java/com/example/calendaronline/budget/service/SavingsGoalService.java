package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.api.SavingsGoalRequest;
import com.example.calendaronline.budget.api.TransactionUpdateRequest;
import com.example.calendaronline.budget.model.BudgetDefaults;
import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import com.example.calendaronline.budget.persistence.SavingsGoalEntity;
import com.example.calendaronline.budget.persistence.SavingsGoalRepository;
import com.example.calendaronline.budget.persistence.SavingsGoalTransactionEntity;
import com.example.calendaronline.budget.persistence.SavingsGoalTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SavingsGoalService {

    private final SavingsGoalRepository savingsGoalRepository;
    private final SavingsGoalTransactionRepository savingsGoalTransactionRepository;
    private final BudgetEventPublisher publisher;
    private final BudgetEventRepository budgetEventRepository;

    public SavingsGoalService(SavingsGoalRepository savingsGoalRepository,
                              SavingsGoalTransactionRepository savingsGoalTransactionRepository,
                              BudgetEventPublisher publisher,
                              BudgetEventRepository budgetEventRepository) {
        this.savingsGoalRepository = savingsGoalRepository;
        this.savingsGoalTransactionRepository = savingsGoalTransactionRepository;
        this.publisher = publisher;
        this.budgetEventRepository = budgetEventRepository;
    }

    @Transactional
    public void reconcileSavingsGoals(String username) {
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
                    BudgetEventType.EXPENSE, missingAmount, BudgetDefaults.DESC_SAVINGS_DEPOSIT_PREFIX + goal.getName(),
                    LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SAVINGS
                ));

                SavingsGoalTransactionEntity initTx = new SavingsGoalTransactionEntity(
                    goal.getId(), username, missingAmount, "Versamento Iniziale", eventId
                );
                savingsGoalTransactionRepository.save(initTx);
            }
        }
    }

    @Transactional
    public List<SavingsGoalEntity> getSavingsGoals(String username) {
        reconcileSavingsGoals(username);
        return savingsGoalRepository.findByUsernameOrderByCreatedAtDesc(username);
    }

    @Transactional
    public SavingsGoalEntity createSavingsGoal(String username, SavingsGoalRequest request) {
        SavingsGoalEntity goal = new SavingsGoalEntity();
        goal.setUsername(username);
        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setTargetDate(request.targetDate());
        if (request.icon() != null && !request.icon().isBlank()) {
            goal.setIcon(request.icon());
        }
        return savingsGoalRepository.save(goal);
    }

    @Transactional
    public SavingsGoalEntity updateSavingsGoal(String username, String id, SavingsGoalRequest request) {
        SavingsGoalEntity goal = getGoalAndValidateOwnership(id, username);
        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setTargetDate(request.targetDate());
        if (request.icon() != null && !request.icon().isBlank()) {
            goal.setIcon(request.icon());
        }
        return savingsGoalRepository.save(goal);
    }

    @Transactional
    public void deleteSavingsGoal(String username, String id) {
        SavingsGoalEntity goal = getGoalAndValidateOwnership(id, username);
        savingsGoalTransactionRepository.deleteBySavingsGoalId(goal.getId());
        savingsGoalRepository.deleteById(goal.getId());
    }

    @Transactional
    public SavingsGoalEntity depositSavingsGoal(String username, String id, BigDecimal amount) {
        SavingsGoalEntity goal = getGoalAndValidateOwnership(id, username);

        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            return goal;
        }

        BigDecimal updated = goal.getCurrentAmount().add(amount);
        if (updated.compareTo(BigDecimal.ZERO) < 0) {
            updated = BigDecimal.ZERO;
        }
        goal.setCurrentAmount(updated);

        String eventId = UUID.randomUUID().toString();
        if (amount.compareTo(BigDecimal.ZERO) > 0) {
            publisher.publish(new BudgetEvent(
                eventId, username,
                BudgetEventType.EXPENSE, amount, BudgetDefaults.DESC_SAVINGS_DEPOSIT_PREFIX + goal.getName(),
                LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SAVINGS
            ));
        } else {
            publisher.publish(new BudgetEvent(
                eventId, username,
                BudgetEventType.INCOME, amount.abs(), BudgetDefaults.DESC_SAVINGS_WITHDRAW_PREFIX + goal.getName(),
                LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SAVINGS
            ));
        }

        String note = amount.compareTo(BigDecimal.ZERO) > 0 ? "Versamento quota" : "Prelievo quota";
        savingsGoalTransactionRepository.save(new SavingsGoalTransactionEntity(
            goal.getId(), username, amount, note, eventId
        ));

        return savingsGoalRepository.save(goal);
    }

    @Transactional
    public List<SavingsGoalTransactionEntity> getSavingsGoalTransactions(String username, String goalId) {
        SavingsGoalEntity goal = getGoalAndValidateOwnership(goalId, username);

        List<SavingsGoalTransactionEntity> list = savingsGoalTransactionRepository.findBySavingsGoalIdOrderByCreatedAtDesc(goalId);

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
                eventId, username,
                BudgetEventType.EXPENSE, missingAmount, BudgetDefaults.DESC_SAVINGS_DEPOSIT_PREFIX + goal.getName(),
                LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SAVINGS
            ));

            SavingsGoalTransactionEntity initTx = new SavingsGoalTransactionEntity(
                goalId, username, missingAmount, "Versamento Iniziale", eventId
            );
            savingsGoalTransactionRepository.save(initTx);

            activeList = savingsGoalTransactionRepository.findBySavingsGoalIdOrderByCreatedAtDesc(goalId).stream()
                .filter(t -> t.getAmount() != null && t.getAmount().compareTo(BigDecimal.ZERO) != 0)
                .collect(Collectors.toList());
        }

        return activeList;
    }

    @Transactional
    public void deleteSavingsGoalTransaction(String username, String goalId, String txId) {
        SavingsGoalEntity goal = getGoalAndValidateOwnership(goalId, username);
        SavingsGoalTransactionEntity tx = savingsGoalTransactionRepository.findById(txId)
            .orElseThrow(() -> new IllegalArgumentException("Transazione non trovata"));

        BigDecimal newAmount = goal.getCurrentAmount().subtract(tx.getAmount());
        if (newAmount.compareTo(BigDecimal.ZERO) < 0) {
            newAmount = BigDecimal.ZERO;
        }
        goal.setCurrentAmount(newAmount);
        savingsGoalRepository.save(goal);

        if (tx.getEventId() != null) {
            budgetEventRepository.deleteById(tx.getEventId());
        } else {
            if (tx.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                publisher.publish(new BudgetEvent(
                    UUID.randomUUID().toString(), username,
                    BudgetEventType.INCOME, tx.getAmount(), BudgetDefaults.DESC_SAVINGS_REVERSE_DEPOSIT_PREFIX + goal.getName(),
                    LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SAVINGS
                ));
            } else if (tx.getAmount().compareTo(BigDecimal.ZERO) < 0) {
                publisher.publish(new BudgetEvent(
                    UUID.randomUUID().toString(), username,
                    BudgetEventType.EXPENSE, tx.getAmount().abs(), BudgetDefaults.DESC_SAVINGS_REVERSE_WITHDRAW_PREFIX + goal.getName(),
                    LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SAVINGS
                ));
            }
        }

        savingsGoalTransactionRepository.deleteById(txId);
    }

    @Transactional
    public SavingsGoalTransactionEntity updateSavingsGoalTransaction(String username,
                                                                    String goalId,
                                                                    String txId,
                                                                    TransactionUpdateRequest request) {
        SavingsGoalEntity goal = getGoalAndValidateOwnership(goalId, username);
        SavingsGoalTransactionEntity tx = savingsGoalTransactionRepository.findById(txId)
            .orElseThrow(() -> new IllegalArgumentException("Transazione non trovata"));

        BigDecimal oldAmount = tx.getAmount();
        BigDecimal newAmount = request.amount();
        BigDecimal delta = newAmount.subtract(oldAmount);

        BigDecimal updatedGoalAmount = goal.getCurrentAmount().add(delta);
        if (updatedGoalAmount.compareTo(BigDecimal.ZERO) < 0) {
            updatedGoalAmount = BigDecimal.ZERO;
        }
        goal.setCurrentAmount(updatedGoalAmount);
        savingsGoalRepository.save(goal);

        tx.setAmount(newAmount);
        if (request.note() != null && !request.note().isBlank()) {
            tx.setNote(request.note());
        }
        savingsGoalTransactionRepository.save(tx);

        if (delta.compareTo(BigDecimal.ZERO) > 0) {
            publisher.publish(new BudgetEvent(
                UUID.randomUUID().toString(), username,
                BudgetEventType.EXPENSE, delta, BudgetDefaults.DESC_SAVINGS_MODIFY_PREFIX + goal.getName(),
                LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SAVINGS
            ));
        } else if (delta.compareTo(BigDecimal.ZERO) < 0) {
            publisher.publish(new BudgetEvent(
                UUID.randomUUID().toString(), username,
                BudgetEventType.INCOME, delta.abs(), BudgetDefaults.DESC_SAVINGS_MODIFY_PREFIX + goal.getName(),
                LocalDate.now(), null, null, BudgetDefaults.CATEGORY_SAVINGS
            ));
        }

        return tx;
    }

    private SavingsGoalEntity getGoalAndValidateOwnership(String goalId, String username) {
        SavingsGoalEntity goal = savingsGoalRepository.findById(goalId)
            .orElseThrow(() -> new IllegalArgumentException("Obiettivo non trovato"));
        if (!goal.getUsername().equals(username)) {
            throw new IllegalArgumentException("Non autorizzato");
        }
        return goal;
    }
}
