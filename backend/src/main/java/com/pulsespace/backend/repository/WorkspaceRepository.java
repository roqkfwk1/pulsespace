package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.workspace.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    // 워크스페이스 조회
    @Query("SELECT w, " +
            "CASE WHEN EXISTS (" +
            "SELECT c FROM Channel c " +
            "LEFT JOIN ChannelMember cm ON cm.channel.id = c.id AND cm.user.id = :userId " +
            "WHERE c.workspace.id = w.id " +
            "AND (cm.lastReadMessageId IS NULL " +
            "OR cm.lastReadMessageId < c.lastMessageId) " +
            "AND (c.visibility = 'PUBLIC' OR " +
            "(c.visibility = 'PRIVATE' AND EXISTS (" +
            "SELECT cm2 FROM ChannelMember cm2 WHERE cm2.channel = c AND cm2.user.id = :userId)))) " +
            "THEN true ELSE false END " +
            "FROM WorkspaceMember wm " +
            "JOIN wm.workspace w " +
            "WHERE wm.user.id = :userId")
    List<Object[]> findWorkspacesWithUnreadByUserId(@Param("userId") Long userId);

    // 소유자로 워크스페이스 찾기
    List<Workspace> findByOwnerId(Long ownerId);
}