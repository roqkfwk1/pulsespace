package com.pulsespace.backend.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ErrorResponse {

    private int status;           // HTTP 상태 코드 (400, 404, 500 등)
    private String message;       // 에러 메시지
    private LocalDateTime timestamp;  // 발생 시간

    public ErrorResponse(int status, String message) {
        this.status = status;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
}