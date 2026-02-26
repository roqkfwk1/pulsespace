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
}