package com.pulsespace.backend.controller;

import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.domain.channel.ChannelMember;
import com.pulsespace.backend.dto.request.AddMemberRequest;
import com.pulsespace.backend.dto.request.CreateChannelRequest;
import com.pulsespace.backend.dto.response.ChannelMemberResponse;
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

    /**
     * 채널 멤버 초대
     */
    @PostMapping("/{channelId}/members")
    public ResponseEntity<Void> addMember(@PathVariable Long channelId, @Valid @RequestBody AddMemberRequest request, @AuthenticationPrincipal Long requesterId) {
        // 채널 멤버 추가
        channelService.addMember(request.getEmail(), channelId, requesterId);
        return ResponseEntity.ok().build();
    }

    /**
     * 채널 멤버 조회
     */
    @GetMapping("/{channelId}/members")
    public ResponseEntity<List<ChannelMemberResponse>> getChannelMembers(@PathVariable Long channelId) {
        // 채널 멤버 조회
        List<ChannelMember> members = channelService.getChannelMembers(channelId);

        // DTO 변환
        List<ChannelMemberResponse> response = members.stream()
                .map(ChannelMemberResponse::of)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * 나의 채널 권한 조회
     */
    @GetMapping("/{channelId}/my-role")
    public ResponseEntity<String> getMyRole(@PathVariable Long channelId, @AuthenticationPrincipal Long userId) {
        // 채널 멤버 조회
        ChannelMember member = channelService.getMyRole(channelId, userId);
        return ResponseEntity.ok(member.getRole().name());
    }
}
