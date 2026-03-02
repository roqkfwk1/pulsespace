package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.domain.channel.ChannelMember;
import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.domain.workspace.Workspace;
import com.pulsespace.backend.exception.BusinessException;
import com.pulsespace.backend.exception.ErrorCode;
import com.pulsespace.backend.repository.*;
import org.springframework.transaction.annotation.Transactional;
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
            throw new BusinessException(ErrorCode.NOT_MEMBER);
        }

        // User, Workspace 찾기
        User user = userRepository.findById(userId).
                orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKSPACE_NOT_FOUND));

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
            throw new BusinessException(ErrorCode.NOT_MEMBER);
        }

        // 채널 목록 조회 (최신순)
        return channelRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    /**
     * 채널 멤버 추가
     */
    @Transactional
    public void addMember(String email, Long channelId, Long requesterId) {
        // 채널 조회
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHANNEL_NOT_FOUND));

        // 요청자 권한 체크 (OWNER만 가능)
        ChannelMember requester = channelMemberRepository.findByChannelIdAndUserId(channelId, requesterId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_MEMBER));
        if (requester.getRole() != ChannelMember.ChannelRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 이메일로 사용자 조회
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 워크스페이스 멤버 체크
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(channel.getWorkspace().getId(), user.getId())) {
            throw new BusinessException(ErrorCode.NOT_MEMBER);
        }

        // 중복 멤버 체크
        if (channelMemberRepository.existsByChannelIdAndUserId(channelId, user.getId())) {
            throw new BusinessException(ErrorCode.DUPLICATE_MEMBER);
        }

        // 채널 멤버 추가
        channelMemberRepository.save(ChannelMember.builder()
                .channel(channel)
                .user(user)
                .role(ChannelMember.ChannelRole.MEMBER)
                .build());
    }

    /**
     * 채널 멤버 조회
     */
    @Transactional(readOnly = true)
    public List<ChannelMember> getChannelMembers(Long channelId) {
        // 채널 존재 여부 체크
        if (!channelRepository.existsById(channelId)) {
            throw new BusinessException(ErrorCode.CHANNEL_NOT_FOUND);
        }

        return channelMemberRepository.findByChannelId(channelId);
    }

    /**
     * 나의 채널 권한 조회
     */
    @Transactional(readOnly = true)
    public ChannelMember getMyRole(Long channelId, Long userId) {
        return channelMemberRepository.findByChannelIdAndUserId(channelId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_MEMBER));
    }
}
