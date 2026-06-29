package com.example.calendaronline.budget.service;

import com.example.calendaronline.budget.model.BudgetEvent;
import com.example.calendaronline.budget.model.DashboardSnapshot;
import com.example.calendaronline.budget.persistence.BudgetEventRepository;
import com.example.calendaronline.user.persistence.AppUserEntity;
import com.example.calendaronline.user.persistence.AppUserRepository;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.List;

@Service
public class MonthlyReportEmailService {

    private final AppUserRepository appUserRepository;
    private final BudgetEventRepository budgetEventRepository;
    private final BudgetEngine budgetEngine;
    private final JavaMailSender mailSender;

    public MonthlyReportEmailService(AppUserRepository appUserRepository,
                                     BudgetEventRepository budgetEventRepository,
                                     BudgetEngine budgetEngine,
                                     JavaMailSender mailSender) {
        this.appUserRepository = appUserRepository;
        this.budgetEventRepository = budgetEventRepository;
        this.budgetEngine = budgetEngine;
        this.mailSender = mailSender;
    }

    public void sendMonthlyReport(String username, YearMonth month) {
        AppUserEntity user = appUserRepository.findById(username).orElse(null);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }

        List<BudgetEvent> events = budgetEventRepository.findByUsernameOrderByEventDateAscIdAsc(username).stream()
            .map(BudgetEventMapper::toModel)
            .toList();

        DashboardSnapshot snapshot = budgetEngine.snapshot(events);
        String text = "Report mese " + month + "\n"
            + "Saldo corrente: " + snapshot.currentBalance() + " EUR\n"
            + "Totale abbonamenti: " + snapshot.monthlySubscriptionsTotal() + " EUR\n"
            + "Movimenti registrati: " + snapshot.latestEntries().size() + "\n"
            + "\nGenerato automaticamente da CalendarOnline.";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(user.getEmail());
        message.setSubject("Report budget " + month);
        message.setText(text);

        try {
            mailSender.send(message);
        } catch (MailException ignored) {
            // In ambiente locale senza SMTP configurato non blocchiamo il flusso.
        }
    }
}

