package com.pulsespace.backend.controller;

import com.pulsespace.backend.domain.workspace.Workspace;
import com.pulsespace.backend.dto.request.CreateWorkspaceRequest;
import com.pulsespace.backend.dto.response.WorkspaceResponse;
import com.pulsespace.backend.service.WorkspaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<WorkspaceResponse> createWorkspace(@RequestHeader("X-User-Id") Long userId, @Valid @RequestBody CreateWorkspaceRequest request) {
        // 워크스페이스 생성
        Workspace workspace = workspaceService.createWorkspace(userId, request.getName(), request.getDescription());

        // DTO 변환 및 반환
        return ResponseEntity.ok(WorkspaceResponse.of(workspace));
    }

    /**
     * 내 워크스페이스 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<WorkspaceResponse>> getMyWorkspaces(@RequestHeader("X-User-Id") Long userId) {
        // 워크스페이스 목록 조회
        List<Workspace> workspaces = workspaceService.getMyWorkspaces(userId);

        // DTO 변환
        List<WorkspaceResponse> response = workspaces.stream()
                .map(WorkspaceResponse::of)
                .toList();

        return ResponseEntity.ok(response);
    }
}