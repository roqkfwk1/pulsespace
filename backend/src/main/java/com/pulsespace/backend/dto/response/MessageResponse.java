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
    private Long senderId;
    private String senderName;
    private String content;
    private Long replyToId;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private LocalDateTime deletedAt;
    private Boolean isDeleted;
    private String type; // CREATED, UPDATED, DELETED

    public static MessageResponse of(Message message, String type){
        return new MessageResponse(
                message.getId(),
                message.getChannel().getId(),
                message.getSender().getId(),
                message.getSender().getName(),
                message.getContent(),
                message.getReplyToId(),
                message.getCreatedAt(),
                message.getEditedAt(),
                message.getDeletedAt(),
                message.getDeletedAt() != null,
                type
        );
    }
}