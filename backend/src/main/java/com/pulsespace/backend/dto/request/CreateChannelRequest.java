package com.pulsespace.backend.dto.request;

import com.pulsespace.backend.domain.channel.Channel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateChannelRequest {

    @NotNull(message = "워크스페이스 ID는 필수입니다.")
    private Long workspaceId;

    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 100, message = "이름은 최대 100자까지 가능합니다.")
    private String name;

    @NotNull(message = "공개 여부는 필수입니다.")
    private Channel.ChannelVisibility visibility;

    @Size(max = 500, message = "설명은 최대 500자까지 가능합니다.")
    private String description;
}