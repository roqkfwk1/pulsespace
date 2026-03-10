package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.channel.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {

    // 워크스페이스의 채널 조회 (PUBLIC: 전체, PRIVATE: 멤버만, 최신순)
    @Query("SELECT c, " +
            "CASE WHEN EXISTS (" +
            "SELECT cm FROM ChannelMember cm " +
            "WHERE cm.channel.id = c.id AND cm.user.id = :userId " +
            "AND c.lastMessageId IS NOT NULL " +
            "AND (cm.lastReadMessageId IS NULL OR cm.lastReadMessageId < c.lastMessageId)) " +
            "THEN true ELSE false END " +
            "FROM Channel c " +
            "WHERE c.workspace.id = :workspaceId " +
            "AND (c.visibility = 'PUBLIC' OR EXISTS (" +
            "SELECT cm2 FROM ChannelMember cm2 WHERE cm2.channel = c AND cm2.user.id = :userId)) " +
            "ORDER BY c.createdAt DESC")
    List<Object[]> findVisibleChannelsWithUnreadByWorkspaceIdAndUserId(@Param("workspaceId") Long workspaceId, @Param("userId") Long userId);

    // 워크스페이스에서 이름으로 채널 찾기
    Optional<Channel> findByWorkspaceIdAndName(Long workspaceId, String name);

    // 워크스페이스의 채널 목록 조회
    List<Channel> findByWorkspaceId(Long workspaceId);

    // 워크스페이스의 채널 전체 삭제
    void deleteByWorkspaceId(Long workspaceId);
}