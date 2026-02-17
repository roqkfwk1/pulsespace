package com.pulsespace.backend.dto.response;

import com.pulsespace.backend.domain.channel.Channel;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ChannelResponse {

    private Long id;
    private Long workspaceId;
    private String name;
    private Channel.ChannelVisibility visibility;
    private String description;
    private LocalDateTime createdAt;

    public static ChannelResponse of(Channel channel) {
        return new ChannelResponse(
                channel.getId(),
                channel.getWorkspace().getId(),
                channel.getName(),
                channel.getVisibility(),
                channel.getDescription(),
                channel.getCreatedAt()
        );
    }
}
