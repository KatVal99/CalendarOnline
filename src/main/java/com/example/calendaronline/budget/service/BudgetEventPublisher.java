package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import org.springframework.beans.factory.annotation.Autowired;

@Service
public class BudgetEventPublisher {

    private final KafkaTemplate<String, BudgetEvent> kafkaTemplate;
    private final String topicName;

    public BudgetEventPublisher(@Autowired(required = false) KafkaTemplate<String, BudgetEvent> kafkaTemplate,
                                @Value("${app.kafka.topic}") String topicName) {
        this.kafkaTemplate = kafkaTemplate;
        this.topicName = topicName;
    }

    public void publish(BudgetEvent event) {
        if (kafkaTemplate != null) {
            try {
                kafkaTemplate.send(topicName, event.eventId(), event);
            } catch (Exception e) {
                // Kafka disabled or unreachable in cloud environment
            }
        }
    }
}

