# PulseSpace

> 워크스페이스 · 채널 기반 실시간 협업 메신저 백엔드

PulseSpace는 팀 단위 협업을 위한 메신저 서비스입니다.  
JWT 인증, 역할 기반 권한 관리, WebSocket/STOMP 실시간 채팅, 읽음/미읽음 처리를 구현했고  
HTTPS 운영 환경, Nginx 리버스 프록시, GitHub Actions 자동 배포까지 실제 운영에 가까운 구조를 직접 적용했습니다.

- 서비스 URL: https://www.pulsespace.kr
- GitHub: https://github.com/roqkfwk1/pulsespace

---

## 1. 기술 스택

**Backend** | Java 21 · Spring Boot · Spring Security · Spring Data JPA · PostgreSQL · Redis · JWT · WebSocket/STOMP  
**Frontend** | React · TypeScript · Vite · Zustand · Axios · STOMP.js  
**Infra** | AWS EC2 · Nginx · Let's Encrypt · systemd · GitHub Actions

---

## 2. 시스템 아키텍처

```
[Browser]
   |
   v
[Nginx :443 (HTTPS / WSS)]
   ├── React 정적 파일 서빙
   ├── /api  → Spring Boot :8080
   └── /ws   → Spring Boot :8080 (WebSocket)
                    |
                    +-- PostgreSQL : 사용자 / 워크스페이스 / 채널 / 메시지
                    +-- Redis      : Refresh Token (TTL 관리)
```

---

## 3. 왜 이렇게 설계했나

### 3-1. Access Token / Refresh Token 분리

Access Token은 15분으로 짧게 유지해 탈취 시 피해 범위를 줄이고,  
Refresh Token은 7일로 설정해 재로그인 없이 인증을 이어갈 수 있도록 했습니다.  
Refresh Token은 Redis에 `refresh:{userId}` 키로 저장해 TTL로 만료를 관리하고, 로그아웃 시 즉시 삭제합니다.

재발급 요청 시 Redis에 저장된 토큰과 요청 토큰을 대조해 탈취 여부를 확인합니다.

```java
String savedToken = refreshTokenService.get(userId);
if (!refreshToken.equals(savedToken)) {
    throw new BusinessException(ErrorCode.INVALID_TOKEN);
}
```

### 3-2. WebSocket + STOMP를 선택한 이유

실시간 채팅은 서버가 클라이언트로 직접 메시지를 push할 수 있는 구조가 필요합니다.  
STOMP를 사용하면 채널별 토픽 구독(`/topic/channel/{id}`)으로 메시지를 선택적으로 수신할 수 있어 채팅 서비스 구조에 적합했습니다.

WebSocket 연결 시점에 JWT를 검증하는 인터셉터를 구현해 인증 없이 연결되는 것을 막았습니다.

```java
if (StompCommand.CONNECT.equals(accessor.getCommand())) {
    String token = accessor.getFirstNativeHeader("Authorization");
    if (token != null && token.startsWith("Bearer ")) {
        token = token.substring(7);
        if (jwtTokenProvider.validateToken(token)) {
            Long userId = jwtTokenProvider.getUserIdFromToken(token);
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                userId, null, Collections.emptyList()));
        }
    }
}
```

### 3-3. 메시지 조회를 최신 50건 + cursor 방식으로 나눈 이유

채팅 진입 시에는 최근 메시지를 바로 보여줘야 하고, 과거 기록 탐색 시에는 이전 메시지를 이어서 불러와야 합니다.  
offset 방식은 데이터가 많아질수록 성능이 저하되므로 `id < cursorId` 조건의 cursor 기반 페이지네이션을 적용했습니다.

```java
if (cursorId == null) {
    return messageRepository.findTop50WithSenderByChannelId(channelId, PageRequest.of(0, 50));
} else {
    return messageRepository.findTop50WithSenderByChannelIdAndIdLessThan(channelId, cursorId, PageRequest.of(0, 50));
}
```

### 3-4. systemd로 애플리케이션을 관리한 이유

배포 초기 `nohup java -jar ... &` 방식으로 실행했는데 SSH 세션 종료 시 함께 종료되는 문제가 있었습니다.  
systemd 서비스로 전환해 서버 재시작 시 자동으로 애플리케이션이 올라오고, 비정상 종료 시 자동 재시작되도록 구성했습니다.

---

## 4. 핵심 구현

### 4-1. 읽음/미읽음 처리

단순해 보이지만 조건이 많은 기능이었습니다.

| 조건 | 처리 방식 |
|---|---|
| 메시지가 없는 채널 | `lastMessageId IS NOT NULL` 조건으로 제외 |
| 내가 멤버가 아닌 채널 | `cm.id IS NOT NULL` 조건으로 제외 |
| 읽음 여부 판단 | `lastReadMessageId < lastMessageId` 비교 |

초기 LEFT JOIN 구현에서 조건 누락으로 unread 오작동이 발생했습니다.  
이후 EXISTS 서브쿼리로 정확성을 먼저 확보했고, 5-2에서 파악한 LEFT JOIN 조건 누락 문제를 반영해  
JOIN 조건과 WHERE 조건을 명확히 분리한 LEFT JOIN 방식으로 최종 개선했습니다.  
자세한 내용은 트러블슈팅 5-2를 참고하세요.

```java
@Query("SELECT c, " +
        "CASE WHEN cm.id IS NOT NULL " +
        "AND c.lastMessageId IS NOT NULL " +
        "AND (cm.lastReadMessageId IS NULL OR cm.lastReadMessageId < c.lastMessageId) " +
        "THEN true ELSE false END " +
        "FROM Channel c " +
        "LEFT JOIN ChannelMember cm ON cm.channel = c AND cm.user.id = :userId " +
        "WHERE c.workspace.id = :workspaceId " +
        "AND (c.visibility = 'PUBLIC' OR cm.id IS NOT NULL) " +
        "ORDER BY c.createdAt DESC")
```

### 4-2. 역할 기반 권한 제어

워크스페이스 멤버 역할(OWNER / ADMIN / MEMBER)과 채널 멤버 역할(OWNER / MEMBER)을 분리해 관리합니다.  
채널 삭제는 채널 OWNER이거나 워크스페이스 OWNER/ADMIN이면 가능하도록 복합 조건으로 처리했습니다.

```java
boolean isChannelOwner = channelMember.isPresent()
    && channelMember.get().getRole() == ChannelMember.ChannelRole.OWNER;
boolean isWorkspaceOwnerOrAdmin =
    workspaceMember.getRole() == WorkspaceMember.MemberRole.OWNER
    || workspaceMember.getRole() == WorkspaceMember.MemberRole.ADMIN;

if (!isChannelOwner && !isWorkspaceOwnerOrAdmin) {
    throw new BusinessException(ErrorCode.FORBIDDEN);
}
```

---

## 5. 트러블슈팅

### 5-1. HTTPS 적용 후 REST API와 WebSocket이 함께 실패한 문제

#### 상황
HTTPS를 적용한 뒤 REST API 요청에서 CORS 오류가 발생하고, WebSocket 연결도 실패했습니다.  
처음에는 Nginx 설정 문제라고 판단했습니다.

#### 원인
Spring Security의 CORS 허용 Origin 설정과 WebSocket `setAllowedOrigins` 설정은 각각 독립적으로 관리됩니다.  
두 설정 모두 `localhost:5173`만 허용하고 있어 운영 도메인이 차단되고 있었습니다.

```java
// 문제: 운영 도메인 누락
configuration.setAllowedOrigins(List.of("http://localhost:5173"));
registry.addEndpoint("/ws").setAllowedOrigins("http://localhost:5173");
```

#### 해결
REST CORS 설정과 WebSocket 허용 Origin 설정에 운영 도메인을 함께 추가했습니다.

```java
configuration.setAllowedOrigins(List.of(
    "http://localhost:5173",
    "https://www.pulsespace.kr",
    "https://pulsespace.kr"
));
registry.addEndpoint("/ws")
    .setAllowedOrigins(
        "http://localhost:5173",
        "https://www.pulsespace.kr",
        "https://pulsespace.kr"
    );
```

#### 배운 점
Spring에서 REST API와 WebSocket CORS 설정은 별개입니다.  
운영 환경 적용 시 HTTP/HTTPS, WS/WSS 흐름 전체를 함께 점검해야 합니다.

---

### 5-2. 미읽음 표시가 멤버가 아닌 채널에도 나타나는 문제

#### 상황
내가 초대되지 않은 채널이나 메시지가 없는 채널에도 unread 표시가 나타났습니다.

#### 원인
초기 구현에서 `LEFT JOIN`으로 `ChannelMember`를 조인했는데,  
JOIN 조건에서 멤버 여부를 걸러내는 조건이 누락되어  
멤버가 아닌 채널도 결과에 포함되고 unread가 잘못 표시됐습니다.

#### 해결
`LEFT JOIN` 방식을 `EXISTS` 서브쿼리로 변경하고, `lastMessageId IS NOT NULL` 조건을 추가해
메시지가 없는 채널과 멤버가 아닌 채널을 명확하게 제외했습니다.

이후 성능 테스트 과정에서 채널별 unread 여부를 확인하는 조회 구조를 다시 점검했고,
`LEFT JOIN`의 `ON` 조건과 `WHERE` 조건을 명확히 분리해
정확성을 유지하면서도 한 번의 조회로 처리되도록 최종 개선했습니다.

#### 결과

k6 부하 테스트 (동시 50명 / 채널 100개)

| API | 평균 (개선 전→후) | p95 (개선 전→후) |
|---|---|---|
| 채널 목록 조회 (unread 포함) | 21ms → 14ms | 31ms → 24ms |

응답시간 차이는 크지 않았지만,  
unread 판단 로직을 단순화하고 채널 목록 조회를 한 번의 쿼리로 처리하도록 정리했습니다.

#### 배운 점
`LEFT JOIN`과 `EXISTS`는 조건 작성 방식에 따라 결과가 달라질 수 있습니다.  
멤버가 아닌 채널을 제외해야 하는 경우에는 LEFT JOIN의 ON 조건과 WHERE 조건을 함께 검토해야 합니다.

---

### 5-3. 권한 변경 API 호출 시 500 오류 (`/members/NaN/role`)

#### 상황
워크스페이스 멤버 권한 변경 요청에서 500 오류가 발생했습니다.  
로그를 보니 요청 URL이 `/api/workspaces/{workspaceId}/members/NaN/role`로 들어오고 있었습니다.

#### 원인
처음에는 백엔드 로직 문제라고 판단했는데,  
실제로는 멤버 목록 응답 DTO에 `userId` 필드가 누락되어 있었습니다.  
프론트에서 `userId`를 URL에 포함하려 했으나 값이 `undefined`여서 `NaN`으로 치환됐습니다.

#### 해결
응답 DTO에 `userId` 필드를 추가했습니다.

```java
public class WorkspaceMemberResponse {
    private Long userId;  // 누락됐던 필드
    private String name;
    private String email;
    private WorkspaceMember.MemberRole role;

    public static WorkspaceMemberResponse of(WorkspaceMember workspaceMember) {
        return new WorkspaceMemberResponse(
            workspaceMember.getUser().getId(),
            workspaceMember.getUser().getName(),
            workspaceMember.getUser().getEmail(),
            workspaceMember.getRole()
        );
    }
}
```

#### 배운 점
500 오류가 발생해도 백엔드 로직부터 보기보다,  
실제 요청 URL과 파라미터 값을 먼저 확인하는 습관이 중요합니다.

---

### 5-4. @Query 사용 시 페이징 미적용으로 전체 메시지를 조회하는 문제

#### 상황
k6 부하 테스트(데이터 10,000건, 동시 50명)에서 최신 메시지 조회 API  
평균 응답시간 8,620ms가 발생했습니다.

#### 원인
`@Query`로 직접 쿼리를 작성할 때 `Pageable`을 전달하지 않으면 LIMIT이 적용되지 않아  
채널의 전체 메시지를 조회하고 있었습니다.  
메서드명의 `Top50`은 Spring Data JPA가 메서드명으로 쿼리를 생성할 때 적용되는 규칙이며,  
`@Query`로 직접 작성한 쿼리에는 자동으로 적용되지 않습니다.

```java
// 문제: Pageable 없이 전체 조회
@Query("select m from Message m join fetch m.sender where m.channel.id = :channelId order by m.id desc")
List<Message> findTop50WithSenderByChannelId(@Param("channelId") Long channelId);
```

#### 해결
`Pageable` 파라미터를 추가해 DB에서 50건만 조회하도록 수정했습니다.

```java
@Query("select m from Message m join fetch m.sender where m.channel.id = :channelId order by m.id desc")
List<Message> findTop50WithSenderByChannelId(@Param("channelId") Long channelId, Pageable pageable);

// 호출 시
return messageRepository.findTop50WithSenderByChannelId(channelId, PageRequest.of(0, 50));
```

#### 결과

k6 부하 테스트 (동시 50명 / 메시지 데이터 10,000건)

※ 500ms는 채팅방 진입 직후 메시지 목록 조회가 지연 없이 느껴지는지 확인하기 위해 설정한 내부 테스트 기준값입니다.  
※ 500ms 초과율은 HTTP 실패율이 아니라, k6의 `응답시간 < 500ms` 체크를 만족하지 못한 요청 비율입니다.

**최신 메시지 조회 개선 결과**

| API | 평균 응답시간 | p95 | 500ms 초과율 |
|---|---|---|---|
| 최신 메시지 조회 | 8,620ms → 21ms | 14,410ms → 40ms | 약 99% → 0% |

**이전 메시지 조회 검증 결과**

| API | 평균 응답시간 | p95 | 500ms 초과율 | 비고 |
|---|---|---|---|---|
| 이전 메시지 조회 | 18ms | 33ms | 0% | 기존 Pageable 적용, <br/>개선 대상 아님 |

#### 배운 점
`@Query`로 쿼리를 직접 작성하는 경우 메서드명의 `Top50` 같은 키워드가 자동으로 적용되지 않습니다.  
페이징이나 조회 개수 제한이 필요한 경우 `Pageable`을 명시적으로 추가해야 합니다.

---

## 6. 개선하고 싶은 것

- WebSocket 연결 단절 시 재연결 전략과 heartbeat 처리가 미흡합니다.

---

## 7. 실행 방법

### Backend

```bash
cd backend
./gradlew bootRun
```

환경 변수:
```
JWT_SECRET=your_secret_key
JWT_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=604800000
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
```

Swagger UI: `http://localhost:8080/swagger-ui/index.html`

### Frontend

```bash
cd frontend
npm install
npm run dev
```