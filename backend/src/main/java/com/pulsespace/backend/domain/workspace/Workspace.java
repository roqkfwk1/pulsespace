package com.pulsespace.backend.domain.workspace;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import com.pulsespace.backend.domain.user.User;

@Entity
@Table(name = "workspaces")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Workspace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;    //Primary Key

    @Column(nullable = false, length = 100)
    private String name;    //워크스페이스 이름

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner; //워크스페이스 소유자 ID

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;    //워크스페이스 생성 시간

    @Column(length = 500)
    private String description; //워크스페이스 설명

    @Column(length = 50)
    private String icon;    //이모지 아이콘

    @Column(length = 7)
    private String colorStart;  //그라데이션 색상 (UI용)

    @Column(length = 7)
    private String colorEnd;    //그라데이션 색상 (UI용)
}