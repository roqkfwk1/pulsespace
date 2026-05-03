package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.dto.response.AuthResponse;
import com.pulsespace.backend.dto.response.TokenResponse;
import com.pulsespace.backend.exception.BusinessException;
import com.pulsespace.backend.exception.ErrorCode;
import com.pulsespace.backend.repository.UserRepository;
import com.pulsespace.backend.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @InjectMocks
    private AuthService authService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Nested
    @DisplayName("회원가입")
    class Signup {

        @Test
        @DisplayName("정상 가입")
        void success() {
            // given
            given(userRepository.existsByEmail("test@test.com")).willReturn(false);
            given(passwordEncoder.encode("test123")).willReturn("encodedPassword");

            // when
            authService.signup("test@test.com", "test123", "홍길동");

            // then
            verify(userRepository, times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("이미 사용 중인 이메일이면 DUPLICATE_EMAIL 예외 발생")
        void duplicateEmail() {
            // given
            given(userRepository.existsByEmail("test@test.com")).willReturn(true);

            // when & then
            assertThatThrownBy(() -> authService.signup("test@test.com", "test123", "홍길동"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_EMAIL);

            verify(userRepository, never()).save(any(User.class));
        }
    }

    @Nested
    @DisplayName("로그인")
    class Login {

        @Test
        @DisplayName("정상 로그인 - Access Token, Refresh Token 반환")
        void success() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("encodedPassword")
                    .name("홍길동")
                    .build();

            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("test123", "encodedPassword")).willReturn(true);
            given(jwtTokenProvider.generateToken(1L)).willReturn("accessToken");
            given(jwtTokenProvider.generateRefreshToken(1L)).willReturn("refreshToken");
            given(jwtTokenProvider.getRefreshExpirationTime()).willReturn(604800000L);

            // when
            AuthResponse response = authService.login("test@test.com", "test123");

            // then
            assertThat(response.getToken()).isEqualTo("accessToken");
            assertThat(response.getRefreshToken()).isEqualTo("refreshToken");
            verify(refreshTokenService, times(1)).save(eq(1L), eq("refreshToken"), eq(604800000L));
        }

        @Test
        @DisplayName("존재하지 않는 이메일이면 EMAIL_NOT_FOUND 예외 발생")
        void emailNotFound() {
            // given
            given(userRepository.findByEmail("none@test.com")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> authService.login("none@test.com", "test123"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.EMAIL_NOT_FOUND);
        }

        @Test
        @DisplayName("비밀번호가 틀리면 INVALID_PASSWORD 예외 발생")
        void wrongPassword() {
            // given
            User user = User.builder()
                    .email("test@test.com")
                    .passwordHash("encodedPassword")
                    .name("홍길동")
                    .build();

            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(user));
            given(passwordEncoder.matches("wrongPassword", "encodedPassword")).willReturn(false);

            // when & then
            assertThatThrownBy(() -> authService.login("test@test.com", "wrongPassword"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_PASSWORD);
        }
    }

    @Nested
    @DisplayName("토큰 재발급")
    class Refresh {

        @Test
        @DisplayName("정상 재발급 - 새 Access Token 반환")
        void success() {
            // given
            given(jwtTokenProvider.validateToken("validRefreshToken")).willReturn(true);
            given(jwtTokenProvider.getUserIdFromToken("validRefreshToken")).willReturn(1L);
            given(refreshTokenService.get(1L)).willReturn("validRefreshToken");
            given(jwtTokenProvider.generateToken(1L)).willReturn("newAccessToken");

            // when
            TokenResponse response = authService.refresh("validRefreshToken");

            // then
            assertThat(response.getToken()).isEqualTo("newAccessToken");
        }

        @Test
        @DisplayName("유효하지 않은 토큰이면 INVALID_TOKEN 예외 발생")
        void invalidToken() {
            // given
            given(jwtTokenProvider.validateToken("invalidToken")).willReturn(false);

            // when & then
            assertThatThrownBy(() -> authService.refresh("invalidToken"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_TOKEN);
        }

        @Test
        @DisplayName("Redis에 저장된 토큰과 다르면 INVALID_TOKEN 예외 발생 (탈취 감지)")
        void tokenMismatch() {
            // given
            given(jwtTokenProvider.validateToken("refreshToken")).willReturn(true);
            given(jwtTokenProvider.getUserIdFromToken("refreshToken")).willReturn(1L);
            given(refreshTokenService.get(1L)).willReturn("differentToken"); // Redis에 다른 토큰

            // when & then
            assertThatThrownBy(() -> authService.refresh("refreshToken"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_TOKEN);
        }
    }

    @Nested
    @DisplayName("로그아웃")
    class Logout {

        @Test
        @DisplayName("정상 로그아웃 - Redis에서 Refresh Token 삭제")
        void success() {
            // given
            given(jwtTokenProvider.validateToken("validRefreshToken")).willReturn(true);
            given(jwtTokenProvider.getUserIdFromToken("validRefreshToken")).willReturn(1L);

            // when
            authService.logout("validRefreshToken");

            // then
            verify(refreshTokenService, times(1)).delete(1L);
        }

        @Test
        @DisplayName("유효하지 않은 토큰으로 로그아웃 시 INVALID_TOKEN 예외 발생")
        void invalidToken() {
            // given
            given(jwtTokenProvider.validateToken("invalidToken")).willReturn(false);

            // when & then
            assertThatThrownBy(() -> authService.logout("invalidToken"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_TOKEN);

            verify(refreshTokenService, never()).delete(anyLong());
        }
    }
}