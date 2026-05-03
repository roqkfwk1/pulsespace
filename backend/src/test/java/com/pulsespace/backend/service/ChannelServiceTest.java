package com.pulsespace.backend.service;

import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.domain.channel.ChannelMember;
import com.pulsespace.backend.domain.user.User;
import com.pulsespace.backend.domain.workspace.Workspace;
import com.pulsespace.backend.domain.workspace.WorkspaceMember;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChannelServiceTest {

    @InjectMocks
    private ChannelService channelService;

    @Mock
    private ChannelRepository channelRepository;

    @Mock
    private ChannelMemberRepository channelMemberRepository;

    @Mock
    private WorkspaceRepository workspaceRepository;

    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MessageRepository messageRepository;

    @Nested
    @DisplayName("채널 생성")
    class CreateChannel {

        @Test
        @DisplayName("정상 생성 - 요청자가 OWNER로 자동 등록됨")
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

            given(workspaceMemberRepository.existsByWorkspaceIdAndUserId(1L, 1L)).willReturn(true);
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(workspaceRepository.findById(1L)).willReturn(Optional.of(workspace));
            given(channelRepository.save(any(Channel.class))).willReturn(channel);

            // when
            channelService.createChannel(1L, 1L, "테스트채널", Channel.ChannelVisibility.PUBLIC);

            // then
            verify(channelRepository, times(1)).save(any(Channel.class));
            verify(channelMemberRepository, times(1)).save(any(ChannelMember.class));
        }

        @Test
        @DisplayName("워크스페이스 멤버가 아닌 사람이 생성 시 NOT_MEMBER 예외 발생")
        void notMember() {
            // given
            given(workspaceMemberRepository.existsByWorkspaceIdAndUserId(1L, 1L)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> channelService.createChannel(1L, 1L, "테스트채널", Channel.ChannelVisibility.PUBLIC))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.NOT_MEMBER);
        }
    }

    @Nested
    @DisplayName("채널 멤버 추가")
    class AddMember {

        @Test
        @DisplayName("채널 OWNER가 멤버 추가 - 정상")
        void success() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User newUser = User.builder()
                    .id(2L)
                    .email("new@test.com")
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

            ChannelMember requester = ChannelMember.builder()
                    .channel(channel)
                    .user(user)
                    .role(ChannelMember.ChannelRole.OWNER)
                    .build();

            given(channelRepository.findById(1L)).willReturn(Optional.of(channel));
            given(channelMemberRepository.findByChannelIdAndUserId(1L, 1L)).willReturn(Optional.of(requester));
            given(userRepository.findByEmail("new@test.com")).willReturn(Optional.of(newUser));
            given(workspaceMemberRepository.existsByWorkspaceIdAndUserId(1L, 2L)).willReturn(true);
            given(channelMemberRepository.existsByChannelIdAndUserId(1L, 2L)).willReturn(false);

            // when
            channelService.addMember("new@test.com", 1L, 1L);

            // then
            verify(channelMemberRepository, times(1)).save(any(ChannelMember.class));
        }

        @Test
        @DisplayName("채널 OWNER가 아닌 사람이 멤버 추가 시 FORBIDDEN 예외 발생")
        void notChannelOwner() {
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

            ChannelMember requester = ChannelMember.builder()
                    .channel(channel)
                    .user(user)
                    .role(ChannelMember.ChannelRole.MEMBER)
                    .build();

            given(channelRepository.findById(1L)).willReturn(Optional.of(channel));
            given(channelMemberRepository.findByChannelIdAndUserId(1L, 1L)).willReturn(Optional.of(requester));

            // when & then
            assertThatThrownBy(() -> channelService.addMember("new@test.com", 1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }

        @Test
        @DisplayName("워크스페이스 멤버가 아닌 사람 추가 시 NOT_MEMBER 예외 발생")
        void notWorkspaceMember() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User newUser = User.builder()
                    .id(2L)
                    .email("new@test.com")
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

            ChannelMember requester = ChannelMember.builder()
                    .channel(channel)
                    .user(user)
                    .role(ChannelMember.ChannelRole.OWNER)
                    .build();

            given(channelRepository.findById(1L)).willReturn(Optional.of(channel));
            given(channelMemberRepository.findByChannelIdAndUserId(1L, 1L)).willReturn(Optional.of(requester));
            given(userRepository.findByEmail("new@test.com")).willReturn(Optional.of(newUser));
            given(workspaceMemberRepository.existsByWorkspaceIdAndUserId(1L, 2L)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> channelService.addMember("new@test.com", 1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.NOT_MEMBER);
        }

        @Test
        @DisplayName("이미 채널 멤버인 사람 추가 시 DUPLICATE_MEMBER 예외 발생")
        void duplicateMember() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User newUser = User.builder()
                    .id(2L)
                    .email("new@test.com")
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

            ChannelMember requester = ChannelMember.builder()
                    .channel(channel)
                    .user(user)
                    .role(ChannelMember.ChannelRole.OWNER)
                    .build();

            given(channelRepository.findById(1L)).willReturn(Optional.of(channel));
            given(channelMemberRepository.findByChannelIdAndUserId(1L, 1L)).willReturn(Optional.of(requester));
            given(userRepository.findByEmail("new@test.com")).willReturn(Optional.of(newUser));
            given(workspaceMemberRepository.existsByWorkspaceIdAndUserId(1L, 2L)).willReturn(true);
            given(channelMemberRepository.existsByChannelIdAndUserId(1L, 2L)).willReturn(true);

            // when & then
            assertThatThrownBy(() -> channelService.addMember("new@test.com", 1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_MEMBER);
        }
    }

    @Nested
    @DisplayName("채널 삭제")
    class DeleteChannel {

        @Test
        @DisplayName("채널 OWNER가 삭제 - 정상")
        void channelOwnerSuccess() {
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

            WorkspaceMember workspaceMember = WorkspaceMember.builder()
                    .id(1L)
                    .workspace(workspace)
                    .user(user)
                    .role(WorkspaceMember.MemberRole.MEMBER)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            ChannelMember requester = ChannelMember.builder()
                    .channel(channel)
                    .user(user)
                    .role(ChannelMember.ChannelRole.OWNER)
                    .build();

            given(channelRepository.findById(1L)).willReturn(Optional.of(channel));
            given(channelMemberRepository.findByChannelIdAndUserId(1L, 1L)).willReturn(Optional.of(requester));
            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 1L)).willReturn(Optional.of(workspaceMember));

            // when
            channelService.deleteChannel(1L, 1L);

            // then
            verify(messageRepository, times(1)).deleteByChannelId(1L);
            verify(channelMemberRepository, times(1)).deleteByChannelId(1L);
            verify(channelRepository, times(1)).delete(channel);
        }

        @Test
        @DisplayName("워크스페이스 OWNER가 삭제 - 정상")
        void workspaceOwnerSuccess() {
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

            WorkspaceMember workspaceMember = WorkspaceMember.builder()
                    .id(1L)
                    .workspace(workspace)
                    .user(user)
                    .role(WorkspaceMember.MemberRole.OWNER)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            given(channelRepository.findById(1L)).willReturn(Optional.of(channel));
            given(channelMemberRepository.findByChannelIdAndUserId(1L, 1L)).willReturn(Optional.empty());
            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 1L)).willReturn(Optional.of(workspaceMember));

            // when
            channelService.deleteChannel(1L, 1L);

            // then
            verify(messageRepository, times(1)).deleteByChannelId(1L);
            verify(channelMemberRepository, times(1)).deleteByChannelId(1L);
            verify(channelRepository, times(1)).delete(channel);
        }

        @Test
        @DisplayName("권한 없는 사람이 삭제 시 FORBIDDEN 예외 발생")
        void forbidden() {
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

            WorkspaceMember workspaceMember = WorkspaceMember.builder()
                    .id(1L)
                    .workspace(workspace)
                    .user(user)
                    .role(WorkspaceMember.MemberRole.MEMBER)
                    .build();

            Channel channel = Channel.builder()
                    .id(1L)
                    .name("테스트채널")
                    .workspace(workspace)
                    .visibility(Channel.ChannelVisibility.PUBLIC)
                    .build();

            ChannelMember requester = ChannelMember.builder()
                    .channel(channel)
                    .user(user)
                    .role(ChannelMember.ChannelRole.MEMBER)
                    .build();

            given(channelRepository.findById(1L)).willReturn(Optional.of(channel));
            given(channelMemberRepository.findByChannelIdAndUserId(1L, 1L)).willReturn(Optional.of(requester));
            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 1L)).willReturn(Optional.of(workspaceMember));

            // when & then
            assertThatThrownBy(() -> channelService.deleteChannel(1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }
    }
}