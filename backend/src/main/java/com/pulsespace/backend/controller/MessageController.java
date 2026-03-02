package com.pulsespace.backend.controller;

import com.pulsespace.backend.domain.message.Message;
import com.pulsespace.backend.dto.request.MarkAsReadRequest;
import com.pulsespace.backend.dto.request.UpdateMessageRequest;
import com.pulsespace.backend.dto.response.MessageResponse;
import com.pulsespace.backend.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    /**
     * 채널의 최신 메시지 50개 조회
     */
    @GetMapping("/channels/{channelId}/messages")
    public ResponseEntity<List<MessageResponse>> getChannelMessages(@AuthenticationPrincipal Long userId, @PathVariable Long channelId) {
        // 채널의 메시지 목록 조회
        List<Message> messages = messageService.getChannelMessages(userId, channelId);

        // DTO 변환
        List<MessageResponse> response = messages.stream()
                .map(MessageResponse::of)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * 읽음 처리
     */
    @PatchMapping("/channels/{channelId}/read")
    public ResponseEntity<Void> markAsRead(@AuthenticationPrincipal Long userId, @PathVariable Long channelId, @Valid @RequestBody MarkAsReadRequest request) {
        // 메시지 읽음 처리
        messageService.markAsRead(userId, channelId, request.getMessageId());

        // 200 OK (Body 없음)
        return ResponseEntity.ok().build();
    }

    /**
     * 메시지 수정
     */
    @PatchMapping("/{messageId}")
    public ResponseEntity<Void> updateContent(@AuthenticationPrincipal Long userId, @PathVariable Long messageId, @Valid @RequestBody UpdateMessageRequest request) {
        // 메시지 수정
        messageService.updateContent(userId, messageId, request.getContent());

        return ResponseEntity.noContent().build();
    }

    /**
     * 메시지 삭제
     */
    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteContent(@AuthenticationPrincipal Long userId, @PathVariable Long messageId) {
        // 메시지 삭제
        messageService.deleteMessage(userId, messageId);

        return ResponseEntity.noContent().build();
    }
}
