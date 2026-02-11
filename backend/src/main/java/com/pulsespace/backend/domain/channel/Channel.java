package com.pulsespace.backend.domain.channel;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import com.pulsespace.backend.domain.workspace.Workspace;

@Entity
@Table(
        name = "channels",
        indexes = @Index(
                name = "idx_channel_workspace_created",
                columnList = "workspace_id, created_at DESC"
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Channel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;    //Primary Key

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;    //워크스페이스 ID

    @Column(nullable = false, length = 100)
    private String name;    //채널 이름

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChannelVisibility visibility;   //공개/비공개

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;    //채널 생성 시간

    @Column(length = 500)
    private String description;     //채널 설명

    @Column(length = 50)
    private String icon;    //이모지 아이콘

    @Column(length = 7)
    private String color;   //채널 색상

    public enum ChannelVisibility {
        PUBLIC,     // 공개
        PRIVATE     // 비공개
    }
}
