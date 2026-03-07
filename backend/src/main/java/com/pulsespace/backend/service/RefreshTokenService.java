package com.pulsespace.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final StringRedisTemplate stringRedisTemplate;

    /**
     * 토큰 저장
     */
    public void save(long userId, String refreshToken, long refreshExpirationTime) {
        stringRedisTemplate.opsForValue().set(
                "refresh:" + userId,    // key
                refreshToken,   // value
                Duration.ofMillis(refreshExpirationTime)  // TTL 설정
        );
    }

    /**
     * 토큰 조회
     */
    public String get(long userId) {
        return stringRedisTemplate.opsForValue().get("refresh:" + userId);
    }

    /**
     * 토큰 삭제
     */
    public void delete(long userId) {
        stringRedisTemplate.delete("refresh:" + userId);
    }
}
