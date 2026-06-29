package com.example.calendaronline.calendar.service;

import com.example.calendaronline.calendar.api.CalendarEventDto;
import com.example.calendaronline.calendar.api.CalendarEventRequest;
import com.example.calendaronline.calendar.persistence.CalendarEventEntity;
import com.example.calendaronline.calendar.persistence.CalendarEventRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;

    public CalendarEventService(CalendarEventRepository calendarEventRepository) {
        this.calendarEventRepository = calendarEventRepository;
    }

    public List<CalendarEventDto> listByMonth(String username, int year, int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        return calendarEventRepository.findByUsernameAndEventDateBetweenOrderByEventDateAscIdAsc(username, from, to)
            .stream()
            .map(this::toDto)
            .toList();
    }

    public CalendarEventDto create(String username, CalendarEventRequest request) {
        validate(request);
        CalendarEventEntity entity = new CalendarEventEntity();
        entity.setUsername(username);
        entity.setEventDate(LocalDate.parse(request.date()));
        entity.setTitle(request.title().trim());
        entity.setCreatedAt(LocalDateTime.now());
        return toDto(calendarEventRepository.save(entity));
    }

    public void delete(String username, Long id) {
        CalendarEventEntity entity = calendarEventRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Evento non trovato"));
        if (!entity.getUsername().equalsIgnoreCase(username)) {
            throw new IllegalArgumentException("Non puoi eliminare eventi di un altro utente");
        }
        calendarEventRepository.deleteById(id);
    }

    private void validate(CalendarEventRequest request) {
        if (request == null || request.date() == null || request.date().isBlank() || request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Data e titolo sono obbligatori");
        }
        if (request.title().trim().length() > 120) {
            throw new IllegalArgumentException("Titolo troppo lungo (max 120 caratteri)");
        }
        LocalDate.parse(request.date());
    }

    private CalendarEventDto toDto(CalendarEventEntity entity) {
        return new CalendarEventDto(entity.getId(), entity.getEventDate().toString(), entity.getTitle());
    }
}

