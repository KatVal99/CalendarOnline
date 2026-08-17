package com.example.calendaronline.calendar.service;

import com.example.calendaronline.calendar.api.CalendarEventDto;
import com.example.calendaronline.calendar.api.CalendarEventRequest;
import com.example.calendaronline.calendar.model.CalendarEventType;
import com.example.calendaronline.calendar.persistence.CalendarEventEntity;
import com.example.calendaronline.calendar.persistence.CalendarEventRepository;
import com.example.calendaronline.config.DatabaseSequenceInitializer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;
    private final DatabaseSequenceInitializer sequenceInitializer;

    public CalendarEventService(CalendarEventRepository calendarEventRepository,
                                DatabaseSequenceInitializer sequenceInitializer) {
        this.calendarEventRepository = calendarEventRepository;
        this.sequenceInitializer = sequenceInitializer;
    }

    public List<CalendarEventDto> listByMonth(String username, int year, int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        return calendarEventRepository.findByUsernameAndEventDateBetweenOrderByEventDateAscEventTimeAscIdAsc(username, from, to)
            .stream()
            .map(this::toDto)
            .toList();
    }

    public CalendarEventDto getNextAppointment(String username) {
        List<CalendarEventDto> upcoming = getUpcomingEvents(username, 1);
        return upcoming.isEmpty() ? null : upcoming.get(0);
    }

    public List<CalendarEventDto> getUpcomingEvents(String username, int limit) {
        return calendarEventRepository.findByUsernameAndEventDateGreaterThanEqualOrderByEventDateAscEventTimeAscIdAsc(username, LocalDate.now())
            .stream()
            .limit(limit > 0 ? limit : 5)
            .map(this::toDto)
            .toList();
    }

    @Transactional
    public CalendarEventDto create(String username, CalendarEventRequest request) {
        validate(request);
        CalendarEventEntity entity = new CalendarEventEntity();
        entity.setUsername(username);
        entity.setEventDate(LocalDate.parse(request.date()));
        entity.setEventTime(parseTime(request.time()));
        entity.setTitle(request.title().trim());
        entity.setEventType(parseEventType(request.eventType()));
        entity.setReminderMinutes(parseReminderMinutes(request.reminderMinutes()));
        entity.setCreatedAt(LocalDateTime.now());
        try {
            return toDto(calendarEventRepository.save(entity));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            sequenceInitializer.syncSequence();
            return toDto(calendarEventRepository.save(entity));
        }
    }

    @Transactional
    public CalendarEventDto update(String username, Long id, CalendarEventRequest request) {
        validate(request);
        CalendarEventEntity entity = calendarEventRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Evento non trovato"));
        if (!entity.getUsername().equalsIgnoreCase(username)) {
            throw new IllegalArgumentException("Non puoi modificare eventi di un altro utente");
        }
        entity.setEventDate(LocalDate.parse(request.date()));
        entity.setEventTime(parseTime(request.time()));
        entity.setTitle(request.title().trim());
        entity.setEventType(parseEventType(request.eventType()));
        entity.setReminderMinutes(parseReminderMinutes(request.reminderMinutes()));
        return toDto(calendarEventRepository.save(entity));
    }

    @Transactional
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
        if (request.time() != null && !request.time().isBlank()) {
            LocalTime.parse(request.time());
        }
        parseEventType(request.eventType());
        parseReminderMinutes(request.reminderMinutes());
    }

    private LocalTime parseTime(String time) {
        if (time == null || time.isBlank()) {
            return null;
        }
        String trimmed = time.trim();
        try {
            if (trimmed.length() > 8) {
                trimmed = trimmed.substring(0, 8);
            }
            if (trimmed.length() == 5) {
                return LocalTime.parse(trimmed);
            }
            return LocalTime.parse(trimmed);
        } catch (Exception e) {
            try {
                return LocalTime.parse(trimmed.substring(0, 5));
            } catch (Exception ex) {
                return null;
            }
        }
    }

    private CalendarEventType parseEventType(String type) {
        if (type == null || type.isBlank()) {
            return CalendarEventType.PERSONAL;
        }
        return CalendarEventType.valueOf(type.trim().toUpperCase());
    }

    private Integer parseReminderMinutes(Integer reminderMinutes) {
        if (reminderMinutes == null) {
            return null;
        }
        if (reminderMinutes < 0 || reminderMinutes > 10080) {
            throw new IllegalArgumentException("Promemoria non valido (0-10080 minuti)");
        }
        return reminderMinutes == 0 ? null : reminderMinutes;
    }


    private CalendarEventDto toDto(CalendarEventEntity entity) {
        CalendarEventType type = entity.getEventType() != null ? entity.getEventType() : CalendarEventType.PERSONAL;
        return new CalendarEventDto(
            entity.getId(),
            entity.getEventDate().toString(),
            entity.getEventTime() != null ? entity.getEventTime().toString() : null,
            entity.getTitle(),
            type.name(),
            entity.getReminderMinutes()
        );
    }
}

