package com.pulsespace.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {

    @NotNull(message = "채널 ID는 필수입니다.")
    private Long channelId;

    @NotBlank(message = "내용은 필수입니다.")
    @Size(min = 1, message = "최소 1자 이상이어야 합니다.")
    private String content;

    private Long replyToId;
}