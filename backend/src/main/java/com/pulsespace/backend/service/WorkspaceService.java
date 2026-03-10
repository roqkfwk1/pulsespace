package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.domain.workspace.Workspace;
import com.pulsespace.backend.domain.workspace.WorkspaceMember;
import com.pulsespace.backend.dto.response.WorkspaceResponse;
import com.pulsespace.backend.exception.BusinessException;
import com.pulsespace.backend.exception.ErrorCode;
import com.pulsespace.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;
    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final MessageRepository messageRepository;

    /**
     * 워크스페이스 생성
     */
    @Transactional
    public Workspace createWorkspace(Long userId, String name, String description) {
        // User 찾기
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Workspace 생성
        Workspace workspace = Workspace.builder()
                .name(name)
                .owner(user)
                .description(description)
                .build();
        workspace = workspaceRepository.save(workspace);

        // WorkspaceMember 생성 (OWNER)
        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(user)
                .role(WorkspaceMember.MemberRole.OWNER)
                .build();
        workspaceMemberRepository.save(member);

        // Workspace 반환
        return workspace;
    }

    /**
     * 나의 워크스페이스 조회
     */
    @Transactional(readOnly = true)
    public List<WorkspaceResponse> getMyWorkspaces(Long userId) {
        // 워크스페이스 목록 + hasUnread 조회
        List<Object[]> results = workspaceRepository.findWorkspacesWithUnreadByUserId(userId);

        // Object[] 파싱
        return results.stream()
                .map(row -> WorkspaceResponse.of((Workspace) row[0], (boolean) row[1]))
                .toList();
    }

    /**
     * 워크스페이스 멤버 추가
     */
    @Transactional
    public void addMember(String email, Long workspaceId, Long requesterId) {
        // 요청자 권한 체크 (OWNER 또는 ADMIN만 가능)
        WorkspaceMember requester = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, requesterId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_MEMBER));
        if (requester.getRole() != WorkspaceMember.MemberRole.OWNER &&
                requester.getRole() != WorkspaceMember.MemberRole.ADMIN) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 이메일로 사용자 조회
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.EMAIL_NOT_FOUND));

        // 워크스페이스 조회
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKSPACE_NOT_FOUND));

        // 중복 멤버 체크
        if (workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, user.getId())) {
            throw new BusinessException(ErrorCode.DUPLICATE_MEMBER);
        }

        // 멤버 추가
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .user(user)
                .role(WorkspaceMember.MemberRole.MEMBER)
                .build());
    }

    /**
     * 나의 워크스페이스 권한 조회
     */
    @Transactional(readOnly = true)
    public WorkspaceMember getMyRole(Long workspaceId, Long userId) {
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_MEMBER));
    }

    /**
     * 워크스페이스 멤버 조회
     */
    @Transactional(readOnly = true)
    public List<WorkspaceMember> getWorkspaceMembers(Long workspaceId) {
        // 워크스페이스 존재 여부 체크
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new BusinessException(ErrorCode.WORKSPACE_NOT_FOUND);
        }

        return workspaceMemberRepository.findByWorkspaceId(workspaceId);
    }

    /**
     * 워크스페이스 삭제
     */
    @Transactional
    public void deleteWorkspace(Long workspaceId, Long userId) {
        // 워크스페이스 조회
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKSPACE_NOT_FOUND));

        // 권한 조회
        if(!workspace.getOwner().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 워크스페이스 채널 조회
        List<Channel> channels = channelRepository.findByWorkspaceId(workspaceId);

        // 채널 ID 목록 추출
        List<Long> channelIds = channels.stream()
                .map(Channel::getId)
                .toList();

        // 워크스페이스의 채널 메시지 전체 삭제
        messageRepository.deleteByChannelIdIn(channelIds);

        // 워크스페이스의 채널 멤버 전체 삭제
        channelMemberRepository.deleteByChannelIdIn(channelIds);

        // 워크스페이스의 채널 전체 삭제
        channelRepository.deleteByWorkspaceId(workspaceId);

        // 워크스페이스 멤버 삭제
        workspaceMemberRepository.deleteByWorkspaceId(workspaceId);

        // 워크스페이스 삭제(관련 데이터 모두 삭제)
        workspaceRepository.delete(workspace);
    }

    /**
     * 워크스페이스 멤버 권한 수정
     */
    @Transactional
    public void updateMemberRole(Long workspaceId, Long targetUserId, WorkspaceMember.MemberRole role, Long requesterId) {
        // 요청자 권한 체크 (OWNER만 가능)
        WorkspaceMember requester = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, requesterId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_MEMBER));
        if (requester.getRole() != WorkspaceMember.MemberRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 대상 멤버 조회
        WorkspaceMember targetMember = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_MEMBER));

        // 자기 자신 변경 방지 - 본인 권한은 본인이 못 바꿈
        if (requesterId.equals(targetUserId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 소유자 양도 시 기존 소유자 관리자로 변경
        if(role == WorkspaceMember.MemberRole.OWNER) {
            requester.updateRole(WorkspaceMember.MemberRole.ADMIN);
        }

        // 멤버 권한 업데이트
        targetMember.updateRole(role);
    }
}