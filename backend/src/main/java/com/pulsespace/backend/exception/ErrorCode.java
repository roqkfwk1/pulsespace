package com.pulsespace.backend.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {
    USER_NOT_FOUND(404, "존재하지 않는 사용자입니다."),
    WORKSPACE_NOT_FOUND(404, "존재하지 않는 워크스페이스입니다."),
    CHANNEL_NOT_FOUND(404, "존재하지 않는 채널입니다."),
    EMAIL_NOT_FOUND(404, "존재하지 않는 이메일입니다."),
    NOT_MEMBER(403, "멤버가 아닙니다."),
    FORBIDDEN(403, "권한이 없습니다."),
    DUPLICATE_MEMBER(400, "이미 멤버입니다."),
    DUPLICATE_EMAIL(400, "이미 사용 중인 이메일입니다."),
    INVALID_PASSWORD(401, "비밀번호가 일치하지 않습니다.");

    private final int status;
    private final String message;

    ErrorCode(int status, String message) {
        this.status = status;
        this.message = message;
    }
}
