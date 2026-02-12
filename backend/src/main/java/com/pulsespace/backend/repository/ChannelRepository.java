package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.channel.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {

    // 워크스페이스의 모든 채널 조회 (최신순)
    List<Channel> findByWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);

    // 워크스페이스에서 이름으로 채널 찾기
    Optional<Channel> findByWorkspaceIdAndName(Long workspaceId, String name);
}