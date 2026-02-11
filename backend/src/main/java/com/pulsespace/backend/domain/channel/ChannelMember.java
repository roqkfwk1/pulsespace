package com.pulsespace.backend.domain.channel;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import com.pulsespace.backend.domain.user.User;

@Entity
@Table(
        name = "channel_members",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"channel_id", "user_id"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChannelMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;    //Primary Key

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;    //채널 ID

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;  //사용자 ID

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChannelRole role;   //멤버 권한

    @Column(name = "last_read_message_id")
    private Long lastReadMessageId; //마지막으로 읽은 메시지 ID

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt; //채널 가입 시간

    public void updateLastReadMessage(Long messageId) {
        this.lastReadMessageId = messageId;
    }

    public enum ChannelRole {
        OWNER,   // 채널 소유자
        MEMBER   // 일반 멤버
    }
}