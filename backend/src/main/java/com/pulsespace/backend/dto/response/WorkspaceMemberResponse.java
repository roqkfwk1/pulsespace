package com.pulsespace.backend.dto.response;

import com.pulsespace.backend.domain.workspace.WorkspaceMember;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class WorkspaceMemberResponse {

    private String name;
    private String email;
    private WorkspaceMember.MemberRole role;

    public static WorkspaceMemberResponse of(WorkspaceMember workspaceMember) {
        return new WorkspaceMemberResponse(
                workspaceMember.getUser().getName(),
                workspaceMember.getUser().getEmail(),
                workspaceMember.getRole()
        );
    }
}
