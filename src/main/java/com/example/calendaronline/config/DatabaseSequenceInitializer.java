package com.example.calendaronline.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSequenceInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseSequenceInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        syncSequence();
    }

    public void syncSequence() {
        try {
            jdbcTemplate.execute("SELECT setval(pg_get_serial_sequence('calendar_events', 'id'), COALESCE((SELECT MAX(id) FROM calendar_events), 1))");
        } catch (Exception ignored) {
        }
    }
}
