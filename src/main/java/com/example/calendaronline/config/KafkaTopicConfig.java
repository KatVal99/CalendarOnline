package com.example.calendaronline.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Configuration
@ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaTopicConfig {

    @Bean
    NewTopic budgetTopic(@Value("${app.kafka.topic}") String topicName) {
        return TopicBuilder.name(topicName)
            .partitions(1)
            .replicas(1)
            .build();
    }
}

