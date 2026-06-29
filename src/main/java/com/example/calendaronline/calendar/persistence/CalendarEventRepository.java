package com.example.calendaronline.calendar.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CalendarEventRepository extends JpaRepository<CalendarEventEntity, Long> {

    List<CalendarEventEntity> findByUsernameOrderByEventDateAscIdAsc(String username);

    List<CalendarEventEntity> findByUsernameAndEventDateBetweenOrderByEventDateAscIdAsc(String username, LocalDate from, LocalDate to);
}

