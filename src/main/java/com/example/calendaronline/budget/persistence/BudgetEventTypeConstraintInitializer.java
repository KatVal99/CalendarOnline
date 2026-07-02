package com.example.calendaronline.budget.persistence;

import com.example.calendaronline.budget.model.BudgetEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Arrays;
import java.util.stream.Collectors;

@Component
public class BudgetEventTypeConstraintInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BudgetEventTypeConstraintInitializer.class);

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public BudgetEventTypeConstraintInitializer(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isPostgres()) {
            return;
        }

        try {
            jdbcTemplate.execute(buildEnsureConstraintSql());
        } catch (RuntimeException ex) {
            // Non blocchiamo il bootstrap: logghiamo e lasciamo che l'app parta comunque.
            log.warn("Impossibile aggiornare il vincolo budget_events_type_check: {}", ex.getMessage());
        }
    }

    private boolean isPostgres() {
        try (Connection connection = dataSource.getConnection()) {
            String product = connection.getMetaData().getDatabaseProductName();
            return product != null && product.toLowerCase().contains("postgresql");
        } catch (Exception ex) {
            log.warn("Impossibile rilevare il database per aggiornare budget_events_type_check: {}", ex.getMessage());
            return false;
        }
    }

    static String buildEnsureConstraintSql() {
        String allowedTypes = Arrays.stream(BudgetEventType.values())
            .map(BudgetEventType::name)
            .map(type -> "'" + type + "'")
            .collect(Collectors.joining(", "));

        return """
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = current_schema()
                  AND table_name = 'budget_events'
              ) THEN
                ALTER TABLE budget_events DROP CONSTRAINT IF EXISTS budget_events_type_check;
                ALTER TABLE budget_events
                  ADD CONSTRAINT budget_events_type_check
                  CHECK (type IN (%s));
              END IF;
            END
            $$;
            """.formatted(allowedTypes);
    }
}

