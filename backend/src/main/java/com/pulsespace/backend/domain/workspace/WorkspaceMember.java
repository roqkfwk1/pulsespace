package com.pulsespace.backend.domain.workspace;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import com.pulsespace.backend.domain.user.User;

@Entity
@Table(
        name = "workspace_members",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"workspace_id", "user_id"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class WorkspaceMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;    //Primary Key

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;    //워크스페이스 ID

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;  //사용자 ID

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberRole role;    //멤버 권한

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt; //워크스페이스 가입 시간

    public enum MemberRole {
        OWNER,   // 소유자
        ADMIN,   // 관리자
        MEMBER   // 일반 멤버
    }
}