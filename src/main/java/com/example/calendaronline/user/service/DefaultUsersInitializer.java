package com.example.calendaronline.user.service;

import com.example.calendaronline.user.persistence.AppUserEntity;
import com.example.calendaronline.user.persistence.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Configuration
public class DefaultUsersInitializer {

    @Bean
    CommandLineRunner seedUsers(AppUserRepository appUserRepository,
                                PasswordEncoder passwordEncoder,
                                @Value("${app.security.user1.username}") String user1,
                                @Value("${app.security.user1.password}") String password1,
                                @Value("${app.security.user2.username}") String user2,
                                @Value("${app.security.user2.password}") String password2) {
        return args -> {
            createIfMissing(appUserRepository, passwordEncoder, user1, password1, user1 + "@example.local");
            createIfMissing(appUserRepository, passwordEncoder, user2, password2, user2 + "@example.local");
        };
    }

    private void createIfMissing(AppUserRepository repository,
                                 PasswordEncoder passwordEncoder,
                                 String username,
                                 String password,
                                 String email) {
        if (repository.existsById(username)) {
            return;
        }

        AppUserEntity user = new AppUserEntity();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setCreatedAt(LocalDateTime.now());
        repository.save(user);
    }
}

