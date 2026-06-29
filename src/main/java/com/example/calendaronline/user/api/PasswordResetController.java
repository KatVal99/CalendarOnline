package com.example.calendaronline.user.api;

import com.example.calendaronline.user.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/reset-password")
    public Map<String, String> requestReset(@RequestBody Map<String, String> body,
                                            HttpServletRequest request) {
        String email = body.getOrDefault("email", "");
        String baseUrl = request.getScheme() + "://" + request.getServerName()
            + (request.getServerPort() != 80 && request.getServerPort() != 443
                ? ":" + request.getServerPort() : "");
        passwordResetService.requestReset(email, baseUrl);
        return Map.of("status", "Se l'email è registrata, riceverai le istruzioni a breve.");
    }

    @PostMapping("/reset-password/confirm")
    public Map<String, String> confirmReset(@RequestBody Map<String, String> body) {
        String token = body.getOrDefault("token", "");
        String newPassword = body.getOrDefault("newPassword", "");
        passwordResetService.confirmReset(token, newPassword);
        return Map.of("status", "Password aggiornata con successo.");
    }
}

