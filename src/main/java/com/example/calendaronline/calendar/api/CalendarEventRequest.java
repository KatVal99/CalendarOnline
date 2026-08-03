package com.example.calendaronline.calendar.api;

public record CalendarEventRequest(
    String date,
    String time,
    String title,
    String eventType,
    Integer reminderMinutes
) {
}

