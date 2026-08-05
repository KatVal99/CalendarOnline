package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class BudgetKafkaConsumer {

    private final BudgetEventRepository budgetEventRepository;

    public BudgetKafkaConsumer(BudgetEventRepository budgetEventRepository) {
        this.budgetEventRepository = budgetEventRepository;
    }

    @KafkaListener(topics = "${app.kafka.topic}", autoStartup = "${spring.kafka.listener.auto-startup:false}")
    public void consume(BudgetEvent event) {
        budgetEventRepository.save(BudgetEventMapper.toEntity(event));
    }
}

