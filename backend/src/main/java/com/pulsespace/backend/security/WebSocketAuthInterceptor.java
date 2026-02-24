package com.pulsespace.backend.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    /**
     * WebSocket 메시지 전송 전 처리
     * CONNECT 시 JWT 토큰을 검증하여 사용자 인증
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // CONNECT 시 JWT 토큰 검증
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // Authorization 헤더에서 토큰 추출
            String token = accessor.getFirstNativeHeader("Authorization");

            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);  // "Bearer " 제거

                // 토큰 검증
                if (jwtTokenProvider.validateToken(token)) {
                    // userId 추출
                    Long userId = jwtTokenProvider.getUserIdFromToken(token);

                    // 인증 정보 생성 및 저장
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    accessor.setUser(authentication);

                    log.info("WebSocket 인증 성공: userId={}", userId);
                }
            }
        }

        return message;
    }
}