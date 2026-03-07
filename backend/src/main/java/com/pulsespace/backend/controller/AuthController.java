package com.pulsespace.backend.controller;

import com.pulsespace.backend.dto.request.LoginRequest;
import com.pulsespace.backend.dto.request.RefreshTokenRequest;
import com.pulsespace.backend.dto.request.SignupRequest;
import com.pulsespace.backend.dto.response.AuthResponse;
import com.pulsespace.backend.dto.response.TokenResponse;
import com.pulsespace.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 회원가입
     */
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        // 회원가입 처리
        authService.signup(request.getEmail(), request.getPassword(), request.getName());

        // 자동 로그인 (JWT 토큰 발급)
        AuthResponse response = authService.login(request.getEmail(), request.getPassword());

        return ResponseEntity.ok(response);
    }

    /**
     * 로그인
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request.getEmail(), request.getPassword());

        return ResponseEntity.ok(response);
    }

    /**
     * 로그아웃
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());

        return ResponseEntity.ok().build();
    }

    /**
     * JWT 토큰 재발급
     */
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestBody RefreshTokenRequest request) {
        TokenResponse response = authService.refresh(request.getRefreshToken());

        return ResponseEntity.ok(response);
    }
}