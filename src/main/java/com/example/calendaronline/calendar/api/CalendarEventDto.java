package com.example.calendaronline.calendar.api;

public record CalendarEventDto(
    Long id,
    String date,
    String time,
    String title,
    String eventType,
    Integer reminderMinutes
) {
}

