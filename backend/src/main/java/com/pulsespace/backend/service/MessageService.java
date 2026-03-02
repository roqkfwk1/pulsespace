package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.domain.channel.ChannelMember;
import com.pulsespace.backend.domain.message.Message;
import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.exception.BusinessException;
import com.pulsespace.backend.exception.ErrorCode;
import com.pulsespace.backend.repository.ChannelMemberRepository;
import com.pulsespace.backend.repository.ChannelRepository;
import com.pulsespace.backend.repository.MessageRepository;
import com.pulsespace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final UserRepository userRepository;

    /**
     * 메시지 전송
     */
    @Transactional
    public Message sendMessage(Long userId, Long channelId, String content, Long replyToId) {
        // 권한 체크 - 채널 멤버인지
        if (!channelMemberRepository.existsByChannelIdAndUserId(channelId, userId)) {
            throw new BusinessException(ErrorCode.NOT_MEMBER);
        }

        // User, Channel 찾기
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHANNEL_NOT_FOUND));

        // Message 생성
        Message message = Message.builder()
                .channel(channel)
                .sender(user)
                .content(content)
                .replyToId(replyToId)  // null 가능
                .build();

        // 저장 및 반환
        return messageRepository.save(message);
    }

    /**
     * 채널의 최신 메시지 50개 조회
     */
    @Transactional(readOnly = true)
    public List<Message> getChannelMessages(Long userId, Long channelId) {
        // 권한 체크
        if (!channelMemberRepository.existsByChannelIdAndUserId(channelId, userId)) {
            throw new BusinessException(ErrorCode.NOT_MEMBER);
        }

        // 메시지 목록 조회 (최신 50개, 역순)
        return messageRepository.findTop50WithSenderByChannelId(channelId);
    }

    /**
     * 읽음 처리
     */
    @Transactional
    public void markAsRead(Long userId, Long channelId, Long messageId) {
        // ChannelMember 찾기
        ChannelMember member = channelMemberRepository
                .findByChannelIdAndUserId(channelId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_MEMBER));

        // Entity의 메서드 호출
        member.updateLastReadMessage(messageId);

        // 저장 (JPA 변경 감지)
        channelMemberRepository.save(member);
    }
}