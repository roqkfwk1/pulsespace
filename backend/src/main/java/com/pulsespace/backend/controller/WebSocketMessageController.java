package com.pulsespace.backend.controller;

import com.pulsespace.backend.dto.request.SendMessageRequest;
import com.pulsespace.backend.dto.response.MessageResponse;
import com.pulsespace.backend.domain.message.Message;
import com.pulsespace.backend.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WebSocketMessageController {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * WebSocket 메시지 전송
     * 클라이언트: /app/messages로 전송
     * 구독자: /topic/channels/{channelId}로 수신
     */
    @MessageMapping("/messages")
    public void sendMessage(@Payload SendMessageRequest request, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();

        // 메시지 저장
        Message message = messageService.sendMessage(
                userId,

                request.getChannelId(),
                request.getContent(),
                request.getReplyToId()
        );

        // 해당 채널 구독자들에게 전송
        messagingTemplate.convertAndSend(
                "/topic/channels/" + request.getChannelId(),
                MessageResponse.of(message)
        );
    }
}