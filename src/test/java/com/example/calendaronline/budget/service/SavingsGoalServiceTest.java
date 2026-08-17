package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.api.SavingsGoalRequest;
import com.example.calendaronline.budget.api.TransactionUpdateRequest;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import com.example.calendaronline.budget.persistence.SavingsGoalEntity;
import com.example.calendaronline.budget.persistence.SavingsGoalRepository;
import com.example.calendaronline.budget.persistence.SavingsGoalTransactionEntity;
import com.example.calendaronline.budget.persistence.SavingsGoalTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SavingsGoalServiceTest {

    @Mock
    private SavingsGoalRepository savingsGoalRepository;

    @Mock
    private SavingsGoalTransactionRepository savingsGoalTransactionRepository;

    @Mock
    private BudgetEventPublisher publisher;

    @Mock
    private BudgetEventRepository budgetEventRepository;

    private SavingsGoalService savingsGoalService;

    @BeforeEach
    void setUp() {
        savingsGoalService = new SavingsGoalService(
            savingsGoalRepository,
            savingsGoalTransactionRepository,
            publisher,
            budgetEventRepository
        );
    }

    @Test
    void testCreateSavingsGoal() {
        SavingsGoalRequest request = new SavingsGoalRequest("Nuova Auto", new BigDecimal("10000.00"), LocalDate.of(2027, 12, 31), "car");

        when(savingsGoalRepository.save(any(SavingsGoalEntity.class))).thenAnswer(invocation -> {
            SavingsGoalEntity entity = invocation.getArgument(0);
            entity.setId("goal-123");
            return entity;
        });

        SavingsGoalEntity result = savingsGoalService.createSavingsGoal("testuser", request);

        assertNotNull(result);
        assertEquals("goal-123", result.getId());
        assertEquals("testuser", result.getUsername());
        assertEquals("Nuova Auto", result.getName());
        assertEquals(new BigDecimal("10000.00"), result.getTargetAmount());
        verify(savingsGoalRepository).save(any(SavingsGoalEntity.class));
    }

    @Test
    void testDepositSavingsGoal_PositiveAmount() {
        SavingsGoalEntity goal = new SavingsGoalEntity();
        goal.setId("goal-1");
        goal.setUsername("testuser");
        goal.setName("Vacanze");
        goal.setCurrentAmount(new BigDecimal("200.00"));

        when(savingsGoalRepository.findById("goal-1")).thenReturn(Optional.of(goal));
        when(savingsGoalRepository.save(any(SavingsGoalEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SavingsGoalEntity updated = savingsGoalService.depositSavingsGoal("testuser", "goal-1", new BigDecimal("50.00"));

        assertEquals(new BigDecimal("250.00"), updated.getCurrentAmount());
        verify(publisher).publish(any());
        verify(savingsGoalTransactionRepository).save(any(SavingsGoalTransactionEntity.class));
    }

    @Test
    void testDepositSavingsGoal_UnauthorizedUser() {
        SavingsGoalEntity goal = new SavingsGoalEntity();
        goal.setId("goal-1");
        goal.setUsername("otheruser");

        when(savingsGoalRepository.findById("goal-1")).thenReturn(Optional.of(goal));

        assertThrows(IllegalArgumentException.class, () -> {
            savingsGoalService.depositSavingsGoal("testuser", "goal-1", new BigDecimal("50.00"));
        });
    }

    @Test
    void testDeleteSavingsGoalTransaction_WithEventId() {
        SavingsGoalEntity goal = new SavingsGoalEntity();
        goal.setId("goal-1");
        goal.setUsername("testuser");
        goal.setName("Fondo Emergenza");
        goal.setCurrentAmount(new BigDecimal("500.00"));

        SavingsGoalTransactionEntity tx = new SavingsGoalTransactionEntity(
            "goal-1", "testuser", new BigDecimal("100.00"), "Versamento", "evt-123"
        );
        tx.setId("tx-1");

        when(savingsGoalRepository.findById("goal-1")).thenReturn(Optional.of(goal));
        when(savingsGoalTransactionRepository.findById("tx-1")).thenReturn(Optional.of(tx));

        savingsGoalService.deleteSavingsGoalTransaction("testuser", "goal-1", "tx-1");

        assertEquals(new BigDecimal("400.00"), goal.getCurrentAmount());
        verify(budgetEventRepository).deleteById("evt-123");
        verify(savingsGoalTransactionRepository).deleteById("tx-1");
    }

    @Test
    void testUpdateSavingsGoalTransaction() {
        SavingsGoalEntity goal = new SavingsGoalEntity();
        goal.setId("goal-1");
        goal.setUsername("testuser");
        goal.setName("Fondo Emergenza");
        goal.setCurrentAmount(new BigDecimal("500.00"));

        SavingsGoalTransactionEntity tx = new SavingsGoalTransactionEntity(
            "goal-1", "testuser", new BigDecimal("100.00"), "Versamento", "evt-123"
        );
        tx.setId("tx-1");

        when(savingsGoalRepository.findById("goal-1")).thenReturn(Optional.of(goal));
        when(savingsGoalTransactionRepository.findById("tx-1")).thenReturn(Optional.of(tx));
        when(savingsGoalTransactionRepository.save(any(SavingsGoalTransactionEntity.class))).thenAnswer(i -> i.getArgument(0));

        TransactionUpdateRequest request = new TransactionUpdateRequest(new BigDecimal("150.00"), "Versamento maggiorato");
        SavingsGoalTransactionEntity result = savingsGoalService.updateSavingsGoalTransaction("testuser", "goal-1", "tx-1", request);

        assertEquals(new BigDecimal("150.00"), result.getAmount());
        assertEquals("Versamento maggiorato", result.getNote());
        assertEquals(new BigDecimal("550.00"), goal.getCurrentAmount());
        verify(publisher).publish(any());
    }
}
