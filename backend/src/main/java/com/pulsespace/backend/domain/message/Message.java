package com.pulsespace.backend.domain.message;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import com.pulsespace.backend.domain.channel.Channel;
import com.pulsespace.backend.domain.user.User;

@Entity
@Table(
        name = "messages",
        indexes = @Index(
                name = "idx_message_channel_id",
                columnList = "channel_id, id DESC"
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;    //채널 ID

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_user_id", nullable = false)
    private User sender;  //메시지 발신자 ID

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content; //메시지 내용

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;    //메시지 작성 시간

    private Long replyToId; //답장할 메시지 ID
}
