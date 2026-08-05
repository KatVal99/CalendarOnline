package com.example.calendaronline.budget.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "savings_goal_transactions")
public class SavingsGoalTransactionEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private String savingsGoalId;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private BigDecimal amount;

    private String note;

    private String eventId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public SavingsGoalTransactionEntity() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
    }

    public SavingsGoalTransactionEntity(String savingsGoalId, String username, BigDecimal amount, String note, String eventId) {
        this.id = UUID.randomUUID().toString();
        this.savingsGoalId = savingsGoalId;
        this.username = username;
        this.amount = amount;
        this.note = note;
        this.eventId = eventId;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSavingsGoalId() {
        return savingsGoalId;
    }

    public void setSavingsGoalId(String savingsGoalId) {
        this.savingsGoalId = savingsGoalId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
