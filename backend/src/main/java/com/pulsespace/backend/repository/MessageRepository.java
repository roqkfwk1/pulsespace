package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.message.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    // 채널의 최신 메시지 50개 (내림차순)
    List<Message> findTop50ByChannelIdOrderByIdDesc(Long channelId);

    // 특정 메시지 이후의 새 메시지들 (실시간 동기화)
    List<Message> findByChannelIdAndIdGreaterThan(Long channelId, Long messageId);

    // 특정 메시지 이전의 메시지들 (페이징 - 더 보기)
    List<Message> findTop50ByChannelIdAndIdLessThanOrderByIdDesc(Long channelId, Long messageId);
}