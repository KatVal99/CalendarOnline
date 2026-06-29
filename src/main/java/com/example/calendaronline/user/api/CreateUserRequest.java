package com.example.calendaronline.user.api;

public record CreateUserRequest(
    String username,
    String password,
    String email
) {
}

