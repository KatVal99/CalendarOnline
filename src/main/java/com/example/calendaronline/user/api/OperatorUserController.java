package com.example.calendaronline.user.api;

import com.example.calendaronline.user.service.UserManagementService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.security.Principal;

@RestController
@RequestMapping("/api/operator/users")
public class OperatorUserController {

    private final UserManagementService userManagementService;

    public OperatorUserController(UserManagementService userManagementService) {
        this.userManagementService = userManagementService;
    }

    @PostMapping
    public Map<String, String> create(@RequestBody CreateUserRequest request) {
        userManagementService.createUser(request);
        return Map.of("status", "created");
    }

    @DeleteMapping("/{email}")
    public Map<String, String> delete(@PathVariable String email, Principal principal) {
        // L'utente autenticato puo solo eliminare il proprio account
        if (principal == null || !principal.getName().equalsIgnoreCase(email)) {
            throw new IllegalArgumentException("Non autorizzato a eliminare questo account");
        }
        userManagementService.deleteUser(email);
        return Map.of("status", "deleted");
    }
}
