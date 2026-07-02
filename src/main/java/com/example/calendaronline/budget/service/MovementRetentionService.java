package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class MovementRetentionService {

    private static final int RETENTION_DAYS = 30;

    private final BudgetEventRepository budgetEventRepository;

    public MovementRetentionService(BudgetEventRepository budgetEventRepository) {
        this.budgetEventRepository = budgetEventRepository;
    }

    @Transactional
    public int purgeExpiredMovements(String username) {
        LocalDate cutoffDate = LocalDate.now().minusDays(RETENTION_DAYS);
        List<BudgetEventEntity> expired = budgetEventRepository
            .findByUsernameAndTypeInAndEventDateBeforeOrderByEventDateAscIdAsc(
                username,
                List.of(BudgetEventType.INCOME, BudgetEventType.EXPENSE),
                cutoffDate
            );

        if (expired.isEmpty()) {
            return 0;
        }

        BigDecimal carryoverDelta = expired.stream()
            .map(this::signedAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        budgetEventRepository.deleteAll(expired);

        if (carryoverDelta.compareTo(BigDecimal.ZERO) != 0) {
            BudgetEvent carryover = new BudgetEvent(
                "carryover-" + username + "-" + LocalDate.now() + "-" + UUID.randomUUID(),
                username,
                BudgetEventType.BALANCE_CARRYOVER,
                carryoverDelta,
                "Saldo consolidato movimenti oltre 30 giorni",
                cutoffDate,
                null,
                null
            );
            budgetEventRepository.save(BudgetEventMapper.toEntity(carryover));
        }

        return expired.size();
    }

    private BigDecimal signedAmount(BudgetEventEntity entity) {
        if (entity.getAmount() == null) {
            return BigDecimal.ZERO;
        }
        return entity.getType() == BudgetEventType.EXPENSE
            ? entity.getAmount().negate()
            : entity.getAmount();
    }
}

