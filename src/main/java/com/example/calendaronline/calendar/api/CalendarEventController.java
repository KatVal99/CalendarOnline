package com.example.calendaronline.calendar.api;

import com.example.calendaronline.calendar.service.CalendarEventService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar/events")
public class CalendarEventController {

    private final CalendarEventService calendarEventService;

    public CalendarEventController(CalendarEventService calendarEventService) {
        this.calendarEventService = calendarEventService;
    }

    @GetMapping
    public List<CalendarEventDto> list(@RequestParam int year,
                                       @RequestParam int month,
                                       Principal principal) {
        return calendarEventService.listByMonth(principal.getName(), year, month);
    }

    @PostMapping
    public CalendarEventDto create(@RequestBody CalendarEventRequest request,
                                   Principal principal) {
        return calendarEventService.create(principal.getName(), request);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id,
                                      Principal principal) {
        calendarEventService.delete(principal.getName(), id);
        return Map.of("status", "deleted");
    }
}

