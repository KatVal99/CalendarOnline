package com.example.calendaronline.user.service;

import com.example.calendaronline.user.persistence.AppUserEntity;
import com.example.calendaronline.user.persistence.AppUserRepository;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final int EXPIRY_HOURS = 2;

    private final AppUserRepository appUserRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(AppUserRepository appUserRepository,
                                JavaMailSender mailSender,
                                PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
    }

    public void requestReset(String email, String baseUrl) {
        AppUserEntity user = appUserRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
        if (user == null) {
            // Risposta silenziosa per non rivelare quali email esistono.
            return;
        }

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(EXPIRY_HOURS));
        appUserRepository.save(user);

        String link = baseUrl + "/reset-password.html?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(user.getEmail());
        message.setSubject("Reset password - Budget Club");
        message.setText(
            "Ciao " + user.getUsername() + ",\n\n"
            + "Hai richiesto il reset della password.\n"
            + "Clicca sul link seguente (valido per " + EXPIRY_HOURS + " ore):\n\n"
            + link + "\n\n"
            + "Se non hai fatto questa richiesta, ignora questa email.\n\n"
            + "Budget Club"
        );

        try {
            mailSender.send(message);
        } catch (MailException ignored) {
            // SMTP non configurato in locale: ignoriamo.
        }
    }

    public void confirmReset(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token non valido");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("La password deve avere almeno 8 caratteri");
        }

        AppUserEntity user = appUserRepository.findByResetToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Token non valido o già utilizzato"));

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            appUserRepository.save(user);
            throw new IllegalArgumentException("Token scaduto. Richiedi un nuovo reset.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        appUserRepository.save(user);
    }
}

