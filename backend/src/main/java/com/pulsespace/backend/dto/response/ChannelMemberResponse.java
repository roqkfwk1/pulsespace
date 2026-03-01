package com.pulsespace.backend.dto.response;

import com.pulsespace.backend.domain.channel.ChannelMember;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChannelMemberResponse {

    private String name;
    private String email;
    private ChannelMember.ChannelRole role;

    public static ChannelMemberResponse of(ChannelMember channelMember) {
        return new ChannelMemberResponse(
                channelMember.getUser().getName(),
                channelMember.getUser().getEmail(),
                channelMember.getRole()
        );
    }
}
