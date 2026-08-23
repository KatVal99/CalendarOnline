package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetDefaults;
import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.BudgetEventType;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class MovementRetentionService {

    private static final Logger log = LoggerFactory.getLogger(MovementRetentionService.class);
    private static final int RETENTION_DAYS = 30;

    private final BudgetEventRepository budgetEventRepository;

    public MovementRetentionService(BudgetEventRepository budgetEventRepository) {
        this.budgetEventRepository = budgetEventRepository;
    }

    @Transactional
    public int purgeExpiredMovements(String username) {
        if (username == null || username.isBlank()) {
            return 0;
        }

        try {
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

            List<String> expiredIds = expired.stream()
                .map(BudgetEventEntity::getId)
                .toList();

            budgetEventRepository.deleteAllByIdIn(expiredIds);

            if (carryoverDelta.compareTo(BigDecimal.ZERO) != 0) {
                BudgetEvent carryover = new BudgetEvent(
                    "carryover-" + username + "-" + LocalDate.now() + "-" + UUID.randomUUID(),
                    username,
                    BudgetEventType.BALANCE_CARRYOVER,
                    carryoverDelta,
                    "Saldo consolidato movimenti oltre 30 giorni",
                    cutoffDate,
                    null,
                    null,
                    BudgetDefaults.CATEGORY_CARRYOVER
                );
                budgetEventRepository.save(BudgetEventMapper.toEntity(carryover));
            }

            return expired.size();
        } catch (Exception ex) {
            log.warn("Errore durante la retention dei movimenti per {}: {}", username, ex.getMessage());
            return 0;
        }
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

