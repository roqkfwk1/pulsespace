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
    @Query("SELECT c FROM Channel c WHERE c.workspace.id = :workspaceId " +
            "AND (c.visibility = 'PUBLIC' OR " +
            "(c.visibility = 'PRIVATE' AND EXISTS (" +
            "SELECT cm FROM ChannelMember cm WHERE cm.channel = c AND cm.user.id = :userId))) " +
            "ORDER BY c.createdAt DESC")
    List<Channel> findVisibleChannelsByWorkspaceIdAndUserId(@Param("workspaceId") Long workspaceId, @Param("userId") Long userId);

    // 워크스페이스에서 이름으로 채널 찾기
    Optional<Channel> findByWorkspaceIdAndName(Long workspaceId, String name);
}