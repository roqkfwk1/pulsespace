package com.pulsespace.backend.dto.request;

import com.pulsespace.backend.domain.workspace.WorkspaceMember;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberRole {

    @NotNull(message = "권한은 필수입니다.")
    private WorkspaceMember.MemberRole role;
}
