package com.pulsespace.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkspaceRequest {

    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 100, message = "이름은 최대 100자까지 가능합니다.")
    private String name;

    @Size(max = 500, message = "설명은 최대 500자까지 가능합니다.")
    private String description;
}