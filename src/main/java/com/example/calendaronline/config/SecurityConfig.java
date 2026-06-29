package com.example.calendaronline.config;

import com.example.calendaronline.user.persistence.AppUserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/index.html", "/login.html", "/reset-password.html",
                    "/style.css", "/app.js", "/common.js", "/layout.js", "/dashboard.js").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/operator/users").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/operator/**").authenticated()
                .requestMatchers("/api/calendar/**").authenticated()
                .requestMatchers("/api/budget/**").authenticated()
                .anyRequest().permitAll())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.setHeader("WWW-Authenticate", "");
                    response.getWriter().write("{\"error\":\"Unauthorized\"}");
                }))
            .httpBasic(basic -> basic.authenticationEntryPoint((request, response, authException) -> {
                response.setStatus(401);
                response.setContentType("application/json");
                response.setHeader("WWW-Authenticate", "");
                response.getWriter().write("{\"error\":\"Unauthorized\"}");
            }));
        return http.build();
    }

    @Bean
    UserDetailsService users(AppUserRepository appUserRepository) {
        return email -> appUserRepository.findById(email == null ? "" : email.trim().toLowerCase())
            .map(user -> org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .roles("USER")
                .build())
            .orElseThrow(() -> new UsernameNotFoundException("Utente non trovato"));
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

