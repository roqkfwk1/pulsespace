package com.pulsespace.backend.dto.response;

import com.pulsespace.backend.domain.message.Message;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class MessageResponse {

    private Long id;
    private Long channelId;
    private String senderName;
    private String content;
    private Long replyToId;
    private LocalDateTime createdAt;

    public static MessageResponse of(Message message){
        return new MessageResponse(
                message.getId(),
                message.getChannel().getId(),
                message.getSender().getName(),
                message.getContent(),
                message.getReplyToId(),
                message.getCreatedAt()
        );
    }
}
