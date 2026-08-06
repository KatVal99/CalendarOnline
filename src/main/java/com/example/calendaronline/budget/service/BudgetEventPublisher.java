package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.springframework.stereotype.Service;

import java.util.logging.Logger;

@Service
public class BudgetEventPublisher {

    private static final Logger log = Logger.getLogger(BudgetEventPublisher.class.getName());

    private final BudgetEventRepository budgetEventRepository;

    public BudgetEventPublisher(BudgetEventRepository budgetEventRepository) {
        this.budgetEventRepository = budgetEventRepository;
    }

    public void publish(BudgetEvent event) {
        log.fine(() -> "Persisting budget event: " + event.eventId());
        budgetEventRepository.save(BudgetEventMapper.toEntity(event));
    }
}
