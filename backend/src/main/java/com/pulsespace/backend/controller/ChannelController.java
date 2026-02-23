package com.pulsespace.backend.controller;

import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.dto.request.CreateChannelRequest;
import com.pulsespace.backend.dto.response.ChannelResponse;
import com.pulsespace.backend.service.ChannelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelService channelService;

    /**
     * 채널 생성
     */
    @PostMapping
    public ResponseEntity<ChannelResponse> createChannel(@AuthenticationPrincipal Long userId, @Valid @RequestBody CreateChannelRequest request) {
        // 채널 생성
        Channel channel = channelService.createChannel(userId, request.getWorkspaceId(), request.getName(), request.getVisibility());

        // DTO 변환 및 반환
        return ResponseEntity.ok(ChannelResponse.of(channel));
    }

    /**
     * 워크스페이스의 채널 목록 조회
      */
    @GetMapping("/workspaces/{workspaceId}/channels")
    public ResponseEntity<List<ChannelResponse>> getWorkspaceChannels(@AuthenticationPrincipal Long userId, @PathVariable Long workspaceId) {
        // 워크스페이스의 채널 목록 조회
        List<Channel> channels = channelService.getWorkspaceChannels(userId, workspaceId);

        // DTO 변환
        List<ChannelResponse> response = channels.stream()
                .map(ChannelResponse::of)
                .toList();

        return ResponseEntity.ok(response);
    }
}
