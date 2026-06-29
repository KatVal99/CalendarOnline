package com.example.calendaronline.user.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUserEntity, String> {

    Optional<AppUserEntity> findByEmail(String email);

    Optional<AppUserEntity> findByResetToken(String resetToken);
}

