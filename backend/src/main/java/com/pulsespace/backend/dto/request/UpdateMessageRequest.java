package com.pulsespace.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMessageRequest {
    @NotBlank(message = "내용을 입력해주세요.")
    private String content;
}
