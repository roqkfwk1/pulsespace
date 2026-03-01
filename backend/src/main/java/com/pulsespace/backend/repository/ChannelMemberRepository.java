package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.channel.ChannelMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelMemberRepository extends JpaRepository<ChannelMember, Long> {

    // 채널의 모든 멤버 조회
    @Query("select m from ChannelMember m join fetch m.user where m.channel.id = :channelId")
    List<ChannelMember> findByChannelId(@Param("channelId") Long channelId);

    // 사용자의 모든 채널 멤버십 조회
    List<ChannelMember> findByUserId(Long userId);

    // 특정 채널에서 특정 사용자 멤버십 찾기
    Optional<ChannelMember> findByChannelIdAndUserId(Long channelId, Long userId);

    // 멤버십 존재 여부 (권한 체크용)
    boolean existsByChannelIdAndUserId(Long channelId, Long userId);
}