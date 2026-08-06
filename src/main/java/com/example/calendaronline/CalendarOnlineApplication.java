package com.example.calendaronline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = { KafkaAutoConfiguration.class })
@EnableScheduling
public class CalendarOnlineApplication {

    public static void main(String[] args) {
        SpringApplication.run(CalendarOnlineApplication.class, args);
    }

}
