package com.pulsespace.backend.dto.response;

import com.pulsespace.backend.domain.user.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AuthResponse {

    private String token;           // Access Token
    private String refreshToken;    // Refresh Token
    private Long userId;
    private String email;
    private String name;

    // Entity → DTO 변환 메서드
    public static AuthResponse of(String token, String refreshToken, User user) {
        return new AuthResponse(
                token,
                refreshToken,
                user.getId(),
                user.getEmail(),
                user.getName()
        );
    }
}