package com.example.calendaronline.budget.persistence;

import com.example.calendaronline.budget.model.BudgetEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface BudgetEventRepository extends JpaRepository<BudgetEventEntity, String> {

    List<BudgetEventEntity> findByUsernameOrderByEventDateAscIdAsc(String username);

    @Query("select distinct e.username from BudgetEventEntity e")
    List<String> findDistinctUsernames();

    boolean existsByUsernameAndTypeAndYearMonth(String username, BudgetEventType type, String yearMonth);

    List<BudgetEventEntity> findByUsernameAndTypeInAndEventDateBeforeOrderByEventDateAscIdAsc(
        String username,
        List<BudgetEventType> types,
        LocalDate eventDate
    );

    @Modifying
    @Transactional
    @Query("delete from BudgetEventEntity e where e.id in :ids")
    int deleteAllByIdIn(List<String> ids);

    @Modifying
    @Transactional
    @Query("delete from BudgetEventEntity e where e.username = :username and e.description = :label and (e.type = 'DEBT_CREATED' or e.type = 'DEBT_REMOVED')")
    int deleteDebtEventsByUsernameAndLabel(String username, String label);

    @Modifying
    @Transactional
    @Query("delete from BudgetEventEntity e where e.username = :username and e.type = :type")
    int deleteByUsernameAndType(String username, BudgetEventType type);

    List<BudgetEventEntity> findByUsernameAndTypeAndYearMonth(String username, BudgetEventType type, String yearMonth);

    boolean existsByUsernameAndTypeAndDescription(String username, BudgetEventType type, String description);
}

