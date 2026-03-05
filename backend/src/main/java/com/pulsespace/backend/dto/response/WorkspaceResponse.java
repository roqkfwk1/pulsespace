package com.pulsespace.backend.dto.response;

import com.pulsespace.backend.domain.workspace.Workspace;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class WorkspaceResponse {

    private Long id;
    private String name;
    private String description;
    private String ownerName;
    private LocalDateTime createdAt;
    private boolean hasUnread;

    public static WorkspaceResponse of(Workspace workspace, boolean hasUnread) {
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.getOwner().getName(),
                workspace.getCreatedAt(),
                hasUnread
        );
    }
}