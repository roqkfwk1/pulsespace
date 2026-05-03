package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.domain.message.Message;
import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.domain.workspace.Workspace;
import com.pulsespace.backend.exception.BusinessException;
import com.pulsespace.backend.exception.ErrorCode;
import com.pulsespace.backend.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @InjectMocks
    private MessageService messageService;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ChannelRepository channelRepository;

    @Mock
    private ChannelMemberRepository channelMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Nested
    @DisplayName("메시지 전송")
    class SendMessage {

        @Test
        @DisplayName("정상 전송")
        void success() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            Message message = Message.builder()
                    .id(1L)
                    .channel(channel)
                    .sender(user)
                    .content("안녕하세요")
                    .build();

            given(channelMemberRepository.existsByChannelIdAndUserId(1L, 1L)).willReturn(true);
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(channelRepository.findById(1L)).willReturn(Optional.of(channel));
            given(messageRepository.save(any(Message.class))).willReturn(message);

            // when
            messageService.sendMessage(1L, 1L, "안녕하세요", null);

            // then
            verify(messageRepository, times(1)).save(any(Message.class));
        }

        @Test
        @DisplayName("채널 멤버가 아닌 사람이 전송 시 NOT_MEMBER 예외 발생")
        void notMember() {
            // given
            given(channelMemberRepository.existsByChannelIdAndUserId(1L, 1L)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> messageService.sendMessage(1L, 1L, "안녕하세요", null))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.NOT_MEMBER);

            verify(messageRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("메시지 조회")
    class GetChannelMessages {

        @Test
        @DisplayName("cursorId 없으면 최신 50개 조회")
        void withoutCursor() {
            // given
            given(channelMemberRepository.existsByChannelIdAndUserId(1L, 1L)).willReturn(true);
            given(messageRepository.findTop50WithSenderByChannelId(1L)).willReturn(List.of());

            // when
            messageService.getChannelMessages(1L, 1L, null);

            // then
            verify(messageRepository, times(1)).findTop50WithSenderByChannelId(1L);
            verify(messageRepository, never()).findTop50WithSenderByChannelIdAndIdLessThan(any(), any(), any());
        }

        @Test
        @DisplayName("cursorId 있으면 cursor 이전 50개 조회")
        void withCursor() {
            // given
            given(channelMemberRepository.existsByChannelIdAndUserId(1L, 1L)).willReturn(true);
            given(messageRepository.findTop50WithSenderByChannelIdAndIdLessThan(
                    eq(1L), eq(10L), any(PageRequest.class))).willReturn(List.of());

            // when
            messageService.getChannelMessages(1L, 1L, 10L);

            // then
            verify(messageRepository, times(1))
                    .findTop50WithSenderByChannelIdAndIdLessThan(eq(1L), eq(10L), any(PageRequest.class));
            verify(messageRepository, never()).findTop50WithSenderByChannelId(any());
        }

        @Test
        @DisplayName("채널 멤버가 아닌 사람이 조회 시 NOT_MEMBER 예외 발생")
        void notMember() {
            // given
            given(channelMemberRepository.existsByChannelIdAndUserId(1L, 1L)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> messageService.getChannelMessages(1L, 1L, null))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.NOT_MEMBER);
        }
    }

    @Nested
    @DisplayName("메시지 수정")
    class UpdateMessage {

        @Test
        @DisplayName("본인 메시지 수정 - 정상")
        void success() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            Message message = Message.builder()
                    .id(1L)
                    .channel(channel)
                    .sender(user)
                    .content("안녕하세요")
                    .build();

            given(messageRepository.findWithSenderById(1L)).willReturn(Optional.of(message));

            // when
            messageService.updateContent(1L, 1L, "반갑습니다");

            // then
            assertThat(message.getContent()).isEqualTo("반갑습니다");
        }

        @Test
        @DisplayName("이미 삭제된 메시지 수정 시 FORBIDDEN 예외 발생")
        void alreadyDeleted() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            Message message = Message.builder()
                    .id(1L)
                    .channel(channel)
                    .sender(user)
                    .content("안녕하세요")
                    .build();

            message.delete(); // deletedAt 세팅

            given(messageRepository.findWithSenderById(1L)).willReturn(Optional.of(message));

            // when & then
            assertThatThrownBy(() -> messageService.updateContent(1L, 1L, "반갑습니다"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }

        @Test
        @DisplayName("타인 메시지 수정 시 FORBIDDEN 예외 발생")
        void forbidden() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User anotherUser = User.builder()
                    .id(2L)
                    .email("other@test.com")
                    .passwordHash("test123")
                    .name("김철수")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            Message message = Message.builder()
                    .id(1L)
                    .channel(channel)
                    .sender(anotherUser)
                    .content("안녕하세요")
                    .build();

            given(messageRepository.findWithSenderById(1L)).willReturn(Optional.of(message));

            // when & then
            assertThatThrownBy(() -> messageService.updateContent(1L, 1L, "반갑습니다"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }
    }

    @Nested
    @DisplayName("메시지 삭제")
    class DeleteMessage {

        @Test
        @DisplayName("본인 메시지 삭제 - 정상")
        void success() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            Message message = Message.builder()
                    .id(1L)
                    .channel(channel)
                    .sender(user)
                    .content("안녕하세요")
                    .build();

            given(messageRepository.findWithSenderById(1L)).willReturn(Optional.of(message));

            // when
            messageService.deleteMessage(1L, 1L);

            // then
            assertThat(message.getDeletedAt()).isNotNull();
        }

        @Test
        @DisplayName("이미 삭제된 메시지 삭제 시 FORBIDDEN 예외 발생")
        void alreadyDeleted() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            Message message = Message.builder()
                    .id(1L)
                    .channel(channel)
                    .sender(user)
                    .content("안녕하세요")
                    .build();

            message.delete();

            given(messageRepository.findWithSenderById(1L)).willReturn(Optional.of(message));

            // when & then
            assertThatThrownBy(() -> messageService.deleteMessage(1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }

        @Test
        @DisplayName("타인 메시지 삭제 시 FORBIDDEN 예외 발생")
        void forbidden() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User anotherUser = User.builder()
                    .id(2L)
                    .email("other@test.com")
                    .passwordHash("test123")
                    .name("김철수").build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            Message message = Message.builder()
                    .id(1L).channel(channel)
                    .sender(anotherUser)
                    .content("안녕하세요")
                    .build();

            given(messageRepository.findWithSenderById(1L)).willReturn(Optional.of(message));

            // when & then - userId=1L이 sender(2L)의 메시지를 삭제 시도
            assertThatThrownBy(() -> messageService.deleteMessage(1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }
    }
}