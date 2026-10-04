package com.designhub.dto;

import com.designhub.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank(message = "Enter your name") @Size(max = 120) String name,
            @NotBlank(message = "Enter your email") @Email(message = "Enter a valid email address") String email,
            @NotBlank(message = "Choose a password") @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String password) {}

    public record LoginRequest(
            @NotBlank(message = "Enter your email") String email,
            @NotBlank(message = "Enter your password") String password) {}

    public record UpdateProfileRequest(@Size(min = 1, max = 120) String name, @Size(max = 500) String avatarUrl) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String newPassword) {}

    public record UserDto(Long id, String email, String name, String avatarUrl, String role) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getName(), u.getAvatarUrl(), u.getRole().name());
        }
    }

    public record AuthResponse(String token, UserDto user) {}
}
