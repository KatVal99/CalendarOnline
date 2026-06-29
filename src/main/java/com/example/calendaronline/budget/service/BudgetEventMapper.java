package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.persistence.BudgetEventEntity;

import java.time.LocalDateTime;

public final class BudgetEventMapper {

    private BudgetEventMapper() {
    }

    public static BudgetEventEntity toEntity(BudgetEvent event) {
        BudgetEventEntity entity = new BudgetEventEntity();
        entity.setId(event.eventId());
        entity.setUsername(event.username());
        entity.setType(event.type());
        entity.setAmount(event.amount());
        entity.setDescription(event.description());
        entity.setEventDate(event.eventDate());
        entity.setYearMonth(event.yearMonth());
        entity.setDurationMonths(event.durationMonths());
        entity.setCreatedAt(LocalDateTime.now());
        return entity;
    }

    public static BudgetEvent toModel(BudgetEventEntity entity) {
        return new BudgetEvent(
            entity.getId(),
            entity.getUsername(),
            entity.getType(),
            entity.getAmount(),
            entity.getDescription(),
            entity.getEventDate(),
            entity.getYearMonth(),
            entity.getDurationMonths()
        );
    }
}

