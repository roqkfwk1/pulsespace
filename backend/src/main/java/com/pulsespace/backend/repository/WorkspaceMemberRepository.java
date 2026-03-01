package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.workspace.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

    // 워크스페이스의 모든 멤버 조회
    @Query("select m from WorkspaceMember m join fetch m.user where m.workspace.id = :workspaceId")
    List<WorkspaceMember> findByWorkspaceId(@Param("workspaceId") Long workspaceId);

    // 사용자의 모든 멤버십 조회 (가입한 워크스페이스들)
    @Query("select m from WorkspaceMember m join fetch m.workspace w join fetch w.owner where m.user.id = :userId")
    List<WorkspaceMember> findByUserId(@Param("userId") Long userId);

    // 특정 워크스페이스에서 특정 사용자 멤버십 찾기
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    // 멤버십 존재 여부 (권한 체크용)
    boolean existsByWorkspaceIdAndUserId(Long workspaceId, Long userId);
}