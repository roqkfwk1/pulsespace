package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.domain.channel.ChannelMember;
import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.domain.workspace.Workspace;
import com.pulsespace.backend.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    /**
     * 채널 생성
     */
    @Transactional
    public Channel createChannel(Long userId, Long workspaceId, String name, Channel.ChannelVisibility visibility) {
        // 권한 체크 (워크스페이스 멤버인지)
        if(!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)){
            throw new IllegalArgumentException("워크스페이스 멤버가 아닙니다.");
        }

        // User, Workspace 찾기
        User user = userRepository.findById(userId).
                orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));

        // Channel 생성
        Channel channel = Channel.builder()
                .workspace(workspace)
                .name(name)
                .visibility(visibility)
                .build();
        channel = channelRepository.save(channel);

        // ChannelMember 생성 (OWNER)
        ChannelMember channelMember = ChannelMember.builder()
                .channel(channel)
                .user(user)
                .role(ChannelMember.ChannelRole.OWNER)
                .build();
        channelMember = channelMemberRepository.save(channelMember);

        // 반환
        return channel;
    }

    /**
     * 워크스페이스의 채널 목록 조회
     */
    public List<Channel> getWorkspaceChannels(Long userId, Long workspaceId) {
        // 권한 체크 - 워크스페이스 멤버인지 확인
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new IllegalArgumentException("워크스페이스 멤버가 아닙니다.");
        }

        // 채널 목록 조회 (최신순)
        return channelRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }
}
