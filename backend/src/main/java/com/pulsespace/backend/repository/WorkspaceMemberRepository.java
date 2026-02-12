package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.workspace.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

    // 워크스페이스의 모든 멤버 조회
    List<WorkspaceMember> findByWorkspaceId(Long workspaceId);

    // 사용자의 모든 멤버십 조회 (가입한 워크스페이스들)
    List<WorkspaceMember> findByUserId(Long userId);

    // 특정 워크스페이스에서 특정 사용자 멤버십 찾기
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    // 멤버십 존재 여부 (권한 체크용)
    boolean existsByWorkspaceIdAndUserId(Long workspaceId, Long userId);
}