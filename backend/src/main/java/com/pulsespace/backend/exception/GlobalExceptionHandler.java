package com.pulsespace.backend.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Validation 실패 (400 Bad Request)
     * @Valid 검증 실패 시
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException e) {

        // 에러 메시지 추출
        FieldError fieldError = e.getBindingResult().getFieldError();
        String message = fieldError != null
                ? fieldError.getDefaultMessage()
                : "잘못된 요청입니다.";

        ErrorResponse error = new ErrorResponse(400, message);
        return ResponseEntity.status(400).body(error);
    }

    /**
     * 비즈니스 로직 예외
     * BusinessException
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        ErrorCode code = e.getErrorCode();
        ErrorResponse error = new ErrorResponse(code.getStatus(), code.getMessage());
        return ResponseEntity.status(code.getStatus()).body(error);
    }

    /**
     * 기타 모든 예외 (500 Internal Server Error)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {

        ErrorResponse error = new ErrorResponse(500, "서버 내부 오류가 발생했습니다.");
        return ResponseEntity.status(500).body(error);
    }
}