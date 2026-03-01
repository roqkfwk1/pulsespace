package com.pulsespace.backend.controller;

import com.pulsespace.backend.domain.workspace.Workspace;
import com.pulsespace.backend.domain.workspace.WorkspaceMember;
import com.pulsespace.backend.dto.request.AddMemberRequest;
import com.pulsespace.backend.dto.request.CreateWorkspaceRequest;
import com.pulsespace.backend.dto.response.WorkspaceMemberResponse;
import com.pulsespace.backend.dto.response.WorkspaceResponse;
import com.pulsespace.backend.service.WorkspaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    /**
     * 워크스페이스 생성
     */
    @PostMapping
    public ResponseEntity<WorkspaceResponse> createWorkspace(@AuthenticationPrincipal Long userId, @Valid @RequestBody CreateWorkspaceRequest request) {
        // 워크스페이스 생성
        Workspace workspace = workspaceService.createWorkspace(userId, request.getName(), request.getDescription());

        // DTO 변환 및 반환
        return ResponseEntity.ok(WorkspaceResponse.of(workspace));
    }

    /**
     * 내 워크스페이스 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<WorkspaceResponse>> getMyWorkspaces(@AuthenticationPrincipal Long userId) {
        // 워크스페이스 목록 조회
        List<Workspace> workspaces = workspaceService.getMyWorkspaces(userId);

        // DTO 변환
        List<WorkspaceResponse> response = workspaces.stream()
                .map(WorkspaceResponse::of)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * 워크스페이스 멤버 초대
     */
    @PostMapping("/{workspaceId}/members")
    public ResponseEntity<Void> addMember(@PathVariable Long workspaceId, @Valid @RequestBody AddMemberRequest request, @AuthenticationPrincipal Long requesterId) {
        // 워크스페이스 멤버 추가
        workspaceService.addMember(request.getEmail(), workspaceId, requesterId);

        return ResponseEntity.ok().build();
    }

    /**
     * 나의 워크스페이스 권한 조회
     */
    @GetMapping("/{workspaceId}/my-role")
    public ResponseEntity<String> getMyRole(@PathVariable Long workspaceId, @AuthenticationPrincipal Long userId) {
        // 워크스페이스 멤버 조회
        WorkspaceMember member = workspaceService.getMyRole(workspaceId, userId);
        return ResponseEntity.ok(member.getRole().name());
    }

    /**
     * 워크스페이스 멤버 조회
     */
    @GetMapping("/{workspaceId}/members")
    public ResponseEntity<List<WorkspaceMemberResponse>> getWorkspaceMembers(@PathVariable Long workspaceId) {
        // 워크스페이스 멤버 조회
        List<WorkspaceMember> members = workspaceService.getWorkspaceMembers(workspaceId);

        // DTO 변환
        List<WorkspaceMemberResponse> response = members.stream()
                .map(WorkspaceMemberResponse::of)
                .toList();

        return ResponseEntity.ok(response);
    }
}