package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import com.example.calendaronline.budget.persistence.CategoryLimitEntity;
import com.example.calendaronline.budget.persistence.CategoryLimitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BudgetForecastServiceTest {

    @Mock
    private BudgetEventRepository budgetEventRepository;

    @Mock
    private CategoryLimitRepository categoryLimitRepository;

    private BudgetForecastService budgetForecastService;

    @BeforeEach
    void setUp() {
        budgetForecastService = new BudgetForecastService(budgetEventRepository, categoryLimitRepository);
    }

    @Test
    void testCalculateForecast() {
        DashboardSnapshot snapshot = new DashboardSnapshot(
            new BigDecimal("1000.00"),
            new BigDecimal("50.00"),
            List.of(),
            List.of(),
            Map.of(),
            Map.of("2026-08", new BigDecimal("2000.00")),
            Map.of("2026-08", new BigDecimal("1000.00")),
            List.of(),
            false
        );

        Map<String, Object> forecast = budgetForecastService.calculateForecast(snapshot);

        assertNotNull(forecast);
        assertEquals(new BigDecimal("1000.00"), forecast.get("currentBalance"));
        assertEquals(new BigDecimal("2000.00"), forecast.get("avgMonthlyIncome"));
        assertEquals(new BigDecimal("1000.00"), forecast.get("avgMonthlyExpense"));
        assertEquals(new BigDecimal("50.00"), forecast.get("subscriptionsTotal"));
        // Net monthly change = 2000 - 1000 - 50 = 950
        assertEquals(new BigDecimal("950.00"), forecast.get("netMonthlyChange"));
        // 3m forecast = 1000 + 3 * 950 = 3850
        assertEquals(new BigDecimal("3850.00"), forecast.get("forecast3Months"));
        // 6m forecast = 1000 + 6 * 950 = 6700
        assertEquals(new BigDecimal("6700.00"), forecast.get("forecast6Months"));
        // 12m forecast = 1000 + 12 * 950 = 12400
        assertEquals(new BigDecimal("12400.00"), forecast.get("forecast12Months"));
    }

    @Test
    void testGetCategorySummary() {
        when(budgetEventRepository.findByUsernameOrderByEventDateAscIdAsc("testuser")).thenReturn(List.of());
        when(categoryLimitRepository.findByUsername("testuser")).thenReturn(List.of(
            new CategoryLimitEntity("testuser", "Spesa", new BigDecimal("300.00"))
        ));

        Map<String, Object> summary = budgetForecastService.getCategorySummary("testuser");

        assertNotNull(summary);
        assertTrue(summary.containsKey("currentMonth"));
        assertTrue(summary.containsKey("expensesByCategory"));
        assertTrue(summary.containsKey("limitsByCategory"));

        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> limits = (Map<String, BigDecimal>) summary.get("limitsByCategory");
        assertEquals(new BigDecimal("300.00"), limits.get("Spesa"));
    }
}
