package com.pulsespace.backend.dto.response;

import com.pulsespace.backend.domain.user.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private Long userId;
    private String email;
    private String name;

    // Entity → DTO 변환 메서드
    public static AuthResponse of(String token, User user) {
        return new AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getName()
        );
    }
}