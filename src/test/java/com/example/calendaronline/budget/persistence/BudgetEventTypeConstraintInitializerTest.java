package com.example.calendaronline.budget.persistence;

import com.example.calendaronline.budget.model.BudgetEventType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BudgetEventTypeConstraintInitializerTest {

    @Test
    void buildEnsureConstraintSqlContainsAllBudgetEventTypes() {
        String sql = BudgetEventTypeConstraintInitializer.buildEnsureConstraintSql();

        for (BudgetEventType type : BudgetEventType.values()) {
            assertThat(sql).contains("'" + type.name() + "'");
        }
        assertThat(sql).contains("budget_events_type_check");
    }
}

