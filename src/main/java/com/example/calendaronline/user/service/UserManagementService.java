package com.example.calendaronline.user.service;

import com.example.calendaronline.user.api.CreateUserRequest;
import com.example.calendaronline.user.persistence.AppUserEntity;
import com.example.calendaronline.user.persistence.AppUserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UserManagementService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public UserManagementService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void createUser(CreateUserRequest request) {
        validate(request);
        String normalizedUsername = normalize(request.username());
        String normalizedEmail = normalize(request.email());

        if (appUserRepository.existsById(normalizedEmail)) {
            throw new IllegalArgumentException("Email gia registrata");
        }

        AppUserEntity user = new AppUserEntity();
        user.setUsername(normalizedUsername);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setEmail(normalizedEmail);
        user.setCreatedAt(LocalDateTime.now());
        appUserRepository.save(user);
    }

    public void deleteUser(String email) {
        String normalizedEmail = normalize(email);
        if (!appUserRepository.existsById(normalizedEmail)) {
            throw new IllegalArgumentException("Utente non trovato");
        }
        appUserRepository.deleteById(normalizedEmail);
    }

    private void validate(CreateUserRequest request) {
        if (request == null || isBlank(request.username()) || isBlank(request.password()) || isBlank(request.email())) {
            throw new IllegalArgumentException("username, password e email sono obbligatori");
        }
        if (request.password().length() < 8) {
            throw new IllegalArgumentException("La password deve avere almeno 8 caratteri");
        }
        if (!request.email().contains("@")) {
            throw new IllegalArgumentException("Email non valida");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String normalize(String value) {
        return value.trim().toLowerCase();
    }
}
