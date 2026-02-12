package com.pulsespace.backend.repository;

import com.pulsespace.backend.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // 이메일로 사용자 찾기 (로그인)
    Optional<User> findByEmail(String email);

    // 이메일 존재 여부 (회원가입 중복 체크)
    boolean existsByEmail(String email);
}