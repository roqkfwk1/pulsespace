package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.dto.response.AuthResponse;
import com.pulsespace.backend.repository.UserRepository;
import com.pulsespace.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 회원가입
     */
    @Transactional
    public void signup(String email, String password, String name) {
        // 이메일 중복 체크
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        // User 생성
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))  // 암호화
                .name(name)
                .build();

        // 저장 및 반환
        userRepository.save(user);
    }

    /**
     * 로그인 - JWT 토큰 반환
     */
    public AuthResponse login(String email, String password) {
        // 이메일로 사용자 찾기
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이메일입니다."));

        // 비밀번호 검증 (암호화된 비밀번호와 비교)
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // JWT 토큰 생성
        String token = jwtTokenProvider.generateToken(user.getId());

        // AuthResponse 생성 및 반환
        return AuthResponse.of(token, user);
    }
}