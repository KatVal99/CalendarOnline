package com.example.calendaronline.calendar.service;

import com.example.calendaronline.calendar.api.CalendarEventDto;
import com.example.calendaronline.calendar.api.CalendarEventRequest;
import com.example.calendaronline.calendar.model.CalendarEventType;
import com.example.calendaronline.calendar.persistence.CalendarEventEntity;
import com.example.calendaronline.calendar.persistence.CalendarEventRepository;
import com.example.calendaronline.config.DatabaseSequenceInitializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CalendarEventServiceTest {

    @Mock
    private CalendarEventRepository calendarEventRepository;

    @Mock
    private DatabaseSequenceInitializer sequenceInitializer;

    private CalendarEventService calendarEventService;

    @BeforeEach
    void setUp() {
        calendarEventService = new CalendarEventService(calendarEventRepository, sequenceInitializer);
    }

    @Test
    void testCreateCalendarEvent() {
        CalendarEventRequest request = new CalendarEventRequest(
            "2026-09-15", "10:30", "Riunione Team", "WORK", 15
        );

        when(calendarEventRepository.save(any(CalendarEventEntity.class))).thenAnswer(invocation -> {
            CalendarEventEntity entity = invocation.getArgument(0);
            entity.setId(101L);
            return entity;
        });

        CalendarEventDto dto = calendarEventService.create("mario", request);

        assertNotNull(dto);
        assertEquals(101L, dto.id());
        assertEquals("2026-09-15", dto.date());
        assertEquals("10:30", dto.time());
        assertEquals("Riunione Team", dto.title());
        assertEquals("WORK", dto.eventType());
        assertEquals(15, dto.reminderMinutes());
    }

    @Test
    void testUpdateCalendarEvent_UnauthorizedUser() {
        CalendarEventEntity existing = new CalendarEventEntity();
        existing.setId(101L);
        existing.setUsername("luigi");
        existing.setTitle("Appuntamento Luigi");
        existing.setEventDate(LocalDate.of(2026, 9, 15));

        when(calendarEventRepository.findById(101L)).thenReturn(Optional.of(existing));

        CalendarEventRequest request = new CalendarEventRequest(
            "2026-09-15", "10:30", "Riunione", "WORK", null
        );

        assertThrows(IllegalArgumentException.class, () -> {
            calendarEventService.update("mario", 101L, request);
        });
    }

    @Test
    void testDeleteCalendarEvent() {
        CalendarEventEntity existing = new CalendarEventEntity();
        existing.setId(101L);
        existing.setUsername("mario");
        existing.setTitle("Dentista");
        existing.setEventDate(LocalDate.of(2026, 9, 20));

        when(calendarEventRepository.findById(101L)).thenReturn(Optional.of(existing));

        calendarEventService.delete("mario", 101L);

        verify(calendarEventRepository).deleteById(101L);
    }

    @Test
    void testListByMonth() {
        CalendarEventEntity entity = new CalendarEventEntity();
        entity.setId(1L);
        entity.setUsername("mario");
        entity.setEventDate(LocalDate.of(2026, 9, 10));
        entity.setEventTime(LocalTime.of(9, 0));
        entity.setTitle("Checkup");
        entity.setEventType(CalendarEventType.HEALTH);

        when(calendarEventRepository.findByUsernameAndEventDateBetweenOrderByEventDateAscEventTimeAscIdAsc(
            eq("mario"), eq(LocalDate.of(2026, 9, 1)), eq(LocalDate.of(2026, 9, 30))
        )).thenReturn(List.of(entity));

        List<CalendarEventDto> events = calendarEventService.listByMonth("mario", 2026, 9);

        assertEquals(1, events.size());
        assertEquals("Checkup", events.get(0).title());
        assertEquals("HEALTH", events.get(0).eventType());
    }
}
