package com.pulsespace.backend.service;

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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceServiceTest {

    @InjectMocks
    private WorkspaceService workspaceService;

    @Mock
    private WorkspaceRepository workspaceRepository;

    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ChannelRepository channelRepository;

    @Mock
    private ChannelMemberRepository channelMemberRepository;

    @Mock
    private MessageRepository messageRepository;

    @Nested
    @DisplayName("워크스페이스 생성")
    class CreateWorkspace {

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

            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(workspaceRepository.save(any())).willReturn(workspace);

            // when
            workspaceService.createWorkspace(1L, "테스트워크스페이스", "설명");

            // then
            verify(workspaceRepository, times(1)).save(any(Workspace.class));
            verify(workspaceMemberRepository, times(1)).save(any(WorkspaceMember.class));
        }

        @Test
        @DisplayName("존재하지 않는 유저면 USER_NOT_FOUND 예외 발생")
        void userNotFound() {
            // given
            given(userRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> workspaceService.createWorkspace(999L, "워크스페이스", "설명"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("워크스페이스 멤버 추가")
    class AddMember {

        @Test
        @DisplayName("OWNER가 멤버 추가 - 정상")
        void success() {
            // given
            User owner = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User newMember = User.builder()
                    .id(2L)
                    .email("new@test.com")
                    .passwordHash("test123")
                    .name("김철수")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(owner)
                    .build();

            WorkspaceMember workspaceMember = WorkspaceMember.builder()
                    .id(1L)
                    .workspace(workspace)
                    .user(owner)
                    .role(WorkspaceMember.MemberRole.OWNER)
                    .build();

            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, owner.getId())).willReturn(Optional.of(workspaceMember));
            given(userRepository.findByEmail("new@test.com")).willReturn(Optional.of(newMember));
            given(workspaceRepository.findById(1L)).willReturn(Optional.of(workspace));
            given(workspaceMemberRepository.existsByWorkspaceIdAndUserId(1L, newMember.getId())).willReturn(false);

            // when
            workspaceService.addMember("new@test.com", 1L, owner.getId());

            // then
            verify(workspaceMemberRepository, times(1)).save(any(WorkspaceMember.class));
        }

        @Test
        @DisplayName("멤버가 아닌 사람이 추가 시 NOT_MEMBER 예외 발생")
        void notMember() {
            // given
            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 1L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> workspaceService.addMember("new@test.com", 1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.NOT_MEMBER);
        }

        @Test
        @DisplayName("MEMBER 권한으로 추가 시 FORBIDDEN 예외 발생")
        void forbidden() {
            // given
            User user = User.builder()
                    .id(2L)
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

            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 2L)).willReturn(Optional.of(workspaceMember));

            // when & then
            assertThatThrownBy(() -> workspaceService.addMember("new@test.com", 1L, 2L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }

        @Test
        @DisplayName("이미 멤버인 사람 추가 시 DUPLICATE_MEMBER 예외 발생")
        void duplicateMember() {
            // given
            User owner = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User newMember = User.builder()
                    .id(2L)
                    .email("new@test.com")
                    .passwordHash("test123")
                    .name("김철수")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(owner)
                    .build();

            WorkspaceMember ownerMember = WorkspaceMember.builder()
                    .id(1L)
                    .workspace(workspace)
                    .user(owner)
                    .role(WorkspaceMember.MemberRole.OWNER)
                    .build();

            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, owner.getId())).willReturn(Optional.of(ownerMember));
            given(userRepository.findByEmail("new@test.com")).willReturn(Optional.of(newMember));
            given(workspaceRepository.findById(1L)).willReturn(Optional.of(workspace));
            given(workspaceMemberRepository.existsByWorkspaceIdAndUserId(1L, newMember.getId())).willReturn(true);

            // when & then
            assertThatThrownBy(() -> workspaceService.addMember("new@test.com", 1L, owner.getId()))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_MEMBER);
        }
    }

    @Nested
    @DisplayName("워크스페이스 삭제")
    class DeleteWorkspace {

        @Test
        @DisplayName("OWNER가 삭제 - 정상")
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

            given(workspaceRepository.findById(1L)).willReturn(Optional.of(workspace));
            given(channelRepository.findByWorkspaceId(1L)).willReturn(List.of());

            // when
            workspaceService.deleteWorkspace(1L, 1L);

            // then
            verify(messageRepository, times(1)).deleteByChannelIdIn(List.of());
            verify(channelMemberRepository, times(1)).deleteByChannelIdIn(List.of());
            verify(channelRepository, times(1)).deleteByWorkspaceId(1L);
            verify(workspaceMemberRepository, times(1)).deleteByWorkspaceId(1L);
            verify(workspaceRepository, times(1)).delete(workspace);
        }

        @Test
        @DisplayName("OWNER가 아닌 사람이 삭제 시 FORBIDDEN 예외 발생")
        void forbidden() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("user@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            given(workspaceRepository.findById(1L))
                    .willReturn(Optional.of(workspace));

            // when & then
            assertThatThrownBy(() -> workspaceService.deleteWorkspace(1L, 2L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);

            verify(channelRepository, never()).findByWorkspaceId(any());
            verify(workspaceRepository, never()).delete(any(Workspace.class));
        }
    }

    @Nested
    @DisplayName("워크스페이스 멤버 권한 수정")
    class UpdateMemberRole {

        @Test
        @DisplayName("OWNER가 다른 멤버 권한 변경 - 정상")
        void success() {
            // given
            User owner = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User targetUser = User.builder()
                    .id(2L)
                    .email("member@test.com")
                    .passwordHash("test123")
                    .name("김철수")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(owner)
                    .build();

            WorkspaceMember requester = WorkspaceMember.builder()
                    .id(1L)
                    .workspace(workspace)
                    .user(owner)
                    .role(WorkspaceMember.MemberRole.OWNER)
                    .build();

            WorkspaceMember targetMember = WorkspaceMember.builder()
                    .id(2L)
                    .workspace(workspace)
                    .user(targetUser)
                    .role(WorkspaceMember.MemberRole.MEMBER)
                    .build();

            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 1L)).willReturn(Optional.of(requester));
            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 2L)).willReturn(Optional.of(targetMember));

            // when
            workspaceService.updateMemberRole(1L, 2L, WorkspaceMember.MemberRole.ADMIN, 1L);

            // then
            assertThat(targetMember.getRole()).isEqualTo(WorkspaceMember.MemberRole.ADMIN);
        }

        @Test
        @DisplayName("OWNER가 아닌 사람이 권한 변경 시 FORBIDDEN 예외 발생")
        void notOwner() {
            // given
            User user = User.builder()
                    .id(1L)
                    .email("test@test.com")
                    .passwordHash("test123")
                    .name("홍길동")
                    .build();

            User requesterUser = User.builder()
                    .id(2L)
                    .email("member@test.com")
                    .passwordHash("test123")
                    .name("김철수")
                    .build();

            Workspace workspace = Workspace.builder()
                    .id(1L)
                    .name("테스트워크스페이스")
                    .owner(user)
                    .build();

            WorkspaceMember requester = WorkspaceMember.builder()
                    .id(1L)
                    .workspace(workspace)
                    .user(requesterUser)
                    .role(WorkspaceMember.MemberRole.MEMBER)
                    .build();

            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 2L)).willReturn(Optional.of(requester));

            // when & then
            assertThatThrownBy(() -> workspaceService.updateMemberRole(1L, 3L, WorkspaceMember.MemberRole.ADMIN, 2L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }

        @Test
        @DisplayName("자기 자신 권한 변경 시 FORBIDDEN 예외 발생")
        void selfUpdate() {
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

            WorkspaceMember requester = WorkspaceMember.builder()
                    .id(1L)
                    .workspace(workspace)
                    .user(user)
                    .role(WorkspaceMember.MemberRole.OWNER)
                    .build();

            given(workspaceMemberRepository.findByWorkspaceIdAndUserId(1L, 1L)).willReturn(Optional.of(requester));

            // when & then
            assertThatThrownBy(() -> workspaceService.updateMemberRole(1L, 1L, WorkspaceMember.MemberRole.ADMIN, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.FORBIDDEN);
        }
    }
}