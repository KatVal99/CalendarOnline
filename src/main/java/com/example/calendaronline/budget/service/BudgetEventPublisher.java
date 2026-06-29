package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class BudgetEventPublisher {

    private final KafkaTemplate<String, BudgetEvent> kafkaTemplate;
    private final String topicName;

    public BudgetEventPublisher(KafkaTemplate<String, BudgetEvent> kafkaTemplate,
                                @Value("${app.kafka.topic}") String topicName) {
        this.kafkaTemplate = kafkaTemplate;
        this.topicName = topicName;
    }

    public void publish(BudgetEvent event) {
        kafkaTemplate.send(topicName, event.eventId(), event);
    }
}

