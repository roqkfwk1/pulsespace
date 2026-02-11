package com.pulsespace.backend.domain.user;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;    //Primary Key

    @Column(nullable = false, unique = true, length = 50)
    private String email;   //로그인 ID,이메일 주소

    @Column(nullable = false)
    private String passwordHash;    //암호화된 비밀번호

    @Column(nullable = false, length = 30)
    private String name;    //사용자 표시 이름

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;    //회원가입 시간
}
