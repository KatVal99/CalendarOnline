package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import org.springframework.stereotype.Service;

import java.util.logging.Logger;

@Service
public class BudgetEventPublisher {

    private static final Logger log = Logger.getLogger(BudgetEventPublisher.class.getName());

    public void publish(BudgetEvent event) {
        log.fine(() -> "Budget event (local-only): " + event.eventId());
    }
}
