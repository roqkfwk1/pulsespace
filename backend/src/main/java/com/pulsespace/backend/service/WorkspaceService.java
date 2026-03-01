package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.domain.workspace.Workspace;
import com.pulsespace.backend.domain.workspace.WorkspaceMember;
import com.pulsespace.backend.repository.UserRepository;
import com.pulsespace.backend.repository.WorkspaceMemberRepository;
import com.pulsespace.backend.repository.WorkspaceRepository;
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

    /**
     * 워크스페이스 생성
     */
    @Transactional
    public Workspace createWorkspace(Long userId, String name, String description) {
        // User 찾기
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

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
    public List<Workspace> getMyWorkspaces(Long userId) {
        // userId로 WorkspaceMember 조회
        List<WorkspaceMember> members = workspaceMemberRepository.findByUserId(userId);

        // Workspace 목록 추출
        return members.stream()
                .map(WorkspaceMember::getWorkspace)
                .toList();
    }

    /**
     * 워크스페이스 멤버 추가
     */
    @Transactional
    public void addMember(String email, Long workspaceId, Long requesterId) {
        // 요청자 권한 체크 (OWNER 또는 ADMIN만 가능)
        WorkspaceMember requester = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, requesterId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스 멤버가 아닙니다."));
        if (requester.getRole() != WorkspaceMember.MemberRole.OWNER &&
                requester.getRole() != WorkspaceMember.MemberRole.ADMIN) {
            throw new IllegalArgumentException("초대 권한이 없습니다.");
        }

        // 이메일로 사용자 조회
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        // 워크스페이스 조회
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));

        // 중복 멤버 체크
        if (workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, user.getId())) {
            throw new IllegalArgumentException("이미 워크스페이스 멤버입니다.");
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
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스 멤버가 아닙니다."));
    }

    /**
     * 워크스페이스 멤버 조회
     */
    @Transactional(readOnly = true)
    public List<WorkspaceMember> getWorkspaceMembers(Long workspaceId) {
        // 워크스페이스 존재 여부 체크
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new IllegalArgumentException("존재하지 않는 워크스페이스입니다.");
        }

        return workspaceMemberRepository.findByWorkspaceId(workspaceId);
    }
}