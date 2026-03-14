# PulseSpace

PulseSpace는 워크스페이스와 채널을 기반으로 팀원들과 실시간으로 소통할 수 있는 팀 메신저 서비스입니다.

이 프로젝트에서는 백엔드 개발을 중심으로 참여했고,  
JWT 인증/재발급, 권한 관리, WebSocket 기반 실시간 채팅, 읽음/미읽음 처리까지 직접 구현했습니다.

이전 프로젝트에서도 배포 자체는 해봤지만,  
이번에는 HTTPS 적용, Nginx 리버스 프록시, GitHub Actions 자동 배포까지 구성하면서  
조금 더 실제 운영 환경에 가깝게 적용해보는 것을 목표로 진행했습니다.

- 서비스 URL: https://www.pulsespace.kr

---

## 프로젝트 소개

PulseSpace는 워크스페이스 안에서 채널을 만들고,  
채널별로 팀원들과 실시간으로 대화할 수 있는 팀 메신저 서비스입니다.

이번 프로젝트에서는 단순히 기능 구현뿐만 아니라,  
배포와 운영 환경에 가까운 구성까지 함께 경험해보는 것을 목표로 했습니다.

특히 아래 내용을 중점적으로 구현해보았습니다.

- JWT 기반 로그인 / 토큰 재발급
- 워크스페이스 / 채널 / 멤버 권한 관리
- WebSocket(STOMP) 기반 실시간 채팅
- 읽음 / 미읽음 처리
- EC2 배포
- Nginx 리버스 프록시 설정
- HTTPS 적용
- GitHub Actions 자동 배포

---

## 주요 기능

### 인증
- 회원가입 / 로그인
- JWT Access Token + Refresh Token 기반 인증
- Access Token 만료 시 Refresh Token을 이용한 재발급

### 워크스페이스 / 채널
- 워크스페이스 생성
- 워크스페이스 멤버 초대
- 멤버 권한 변경
- 채널 생성 / 삭제
- 채널 멤버 초대

### 실시간 채팅
- WebSocket(STOMP) 기반 실시간 메시지 송수신
- 채널별 메시지 구독
- 메시지 인용 답장

### 읽음 / 미읽음
- 채널별 unread 표시
- 마지막으로 읽은 메시지 기준 읽음 처리
- 워크스페이스 진입 시 채널 목록 unread 상태 반영

---

## 기술 스택

### Backend
- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- PostgreSQL
- Redis
- WebSocket / STOMP
- JWT
- Gradle

### Frontend
- TypeScript
- React
- Vite
- Zustand
- Axios
- STOMP.js

### Infra
- AWS EC2
- Nginx
- Let's Encrypt
- systemd
- GitHub Actions

---

## 시스템 아키텍처

```text
[ 사용자 브라우저 ]
        │
        ▼
[ Nginx :443 (HTTPS / WSS) ]
        ├── React 정적 파일 서빙
        └── /api, /ws → Spring Boot :8080
                              │
                    ┌─────────┴─────────┐
               PostgreSQL            Redis
```

- Nginx가 프론트엔드 정적 파일 서빙과 리버스 프록시 역할을 담당합니다.
- `/api`, `/ws` 요청은 Spring Boot 서버로 전달됩니다.
- PostgreSQL에는 사용자, 워크스페이스, 채널, 메시지 데이터를 저장합니다.
- Redis에는 Refresh Token을 저장합니다.
- GitHub Actions를 이용해 main 브랜치 push 시 자동 배포되도록 구성했습니다.

---

## 프로젝트 구조

```text
pulsespace/
├── backend/
│   └── src/main/java/com/pulsespace/backend/
│       ├── config/
│       ├── controller/
│       ├── domain/
│       ├── dto/
│       ├── exception/
│       ├── repository/
│       ├── security/
│       └── service/
└── frontend/
    └── src/
        ├── api/
        ├── components/
        ├── hooks/
        ├── pages/
        ├── stores/
        ├── types/
        └── utils/
```

---

## 백엔드에서 구현하며 신경 쓴 부분

### 1. JWT 인증 / 재발급
로그인 시 Access Token과 Refresh Token을 발급하고,  
Access Token이 만료되면 Refresh Token으로 다시 발급받을 수 있도록 구현했습니다.

단순 로그인 기능 구현에 그치지 않고,  
토큰 검증과 재발급 흐름까지 직접 다뤄볼 수 있었습니다.

### 2. 권한 관리
워크스페이스 안에서 사용자 역할에 따라 권한을 다르게 처리했습니다.

- 소유자
- 관리자
- 멤버

단순히 로그인 여부만 확인하는 것이 아니라,  
같은 워크스페이스 안에서도 역할에 따라 접근 가능한 기능이 달라지도록 구현했습니다.

### 3. WebSocket 실시간 채팅
이번 프로젝트에서 WebSocket(STOMP)을 처음 적용해보았습니다.

REST API와는 다르게 연결 유지, CORS, HTTPS 환경에서의 WSS 연결까지 함께 고려해야 해서  
처음 생각했던 것보다 신경 써야 할 부분이 많았습니다.

### 4. 읽음 / 미읽음 처리
unread 처리는 단순해 보이지만 실제로는 조건이 꽤 많았습니다.

예를 들어,
- 메시지가 없는 채널은 unread로 표시하지 않기
- 내가 멤버가 아닌 채널은 제외하기
- 마지막으로 읽은 메시지와 마지막 메시지를 비교하기

이런 조건들을 맞추는 과정에서 쿼리를 여러 번 수정했고,  
기능 조건이 많을수록 로직과 쿼리를 더 꼼꼼하게 봐야 한다는 점을 배웠습니다.

---

## 트러블슈팅

### 1. GitHub Actions 배포 후 애플리케이션이 바로 종료된 문제

#### 상황
GitHub Actions에서 SSH로 접속해 `nohup java -jar ... &` 방식으로 실행했는데,  
배포가 끝난 뒤 애플리케이션도 같이 종료되는 문제가 있었습니다.

#### 원인
처음에는 `nohup`으로 해결될 것이라고 생각했지만,  
실제로는 SSH 세션이 종료될 때 프로세스도 영향을 받고 있었습니다.

#### 해결
직접 실행하는 대신 systemd 서비스로 애플리케이션을 관리하도록 변경했습니다.

```ini
[Service]
Type=simple
EnvironmentFile=/etc/pulsespace/.env
ExecStart=/usr/bin/java -jar /home/ubuntu/pulsespace.jar
Restart=always
```

#### 배운 점
운영 환경에서는 단순 실행보다  
프로세스를 안정적으로 관리하는 방식이 더 중요하다는 점을 배웠습니다.

---

### 2. HTTPS 적용 후 CORS 오류와 WebSocket 연결 실패가 같이 발생한 문제

#### 상황
HTTPS를 적용한 뒤 REST API 요청에서 403이 발생했고,  
WebSocket 연결도 실패했습니다.

#### 원인
처음에는 Nginx 설정 문제라고 생각했지만,  
실제로는 Spring Security의 CORS 설정과 WebSocket 설정이 각각 따로 있었고  
둘 다 로컬 주소만 허용하고 있었습니다.

#### 해결
운영 도메인을 두 설정에 모두 추가했습니다.

```java
configuration.setAllowedOrigins(List.of(
        "http://localhost:5173",
        "https://www.pulsespace.kr"
));

registry.addEndpoint("/ws")
        .setAllowedOrigins("http://localhost:5173", "https://www.pulsespace.kr");
```

#### 배운 점
REST API와 WebSocket은 별도로 설정을 확인해야 하고,  
운영 환경에서는 HTTP/HTTPS, WS/WSS까지 함께 고려해야 한다는 점을 배웠습니다.

---

### 3. 미읽음 표시가 잘못된 채널에도 나타난 문제

#### 상황
메시지가 없는 채널이나 내가 멤버가 아닌 채널에도 unread 표시가 나타나는 문제가 있었습니다.

#### 원인
unread 여부를 판단하는 JPQL 쿼리에서 몇 가지 조건이 빠져 있었습니다.

- `lastMessageId IS NOT NULL`
- 실제 채널 멤버인지 확인하는 조건

또한 `LEFT JOIN` 때문에 의도하지 않은 결과가 포함되고 있었습니다.

#### 해결
- 메시지가 있는 채널만 unread 판단 대상이 되도록 조건을 추가했습니다.
- `LEFT JOIN` 대신 `EXISTS` 방식으로 변경했습니다.

```java
@Query("SELECT c, " +
        "CASE WHEN EXISTS (" +
        "  SELECT cm FROM ChannelMember cm " +
        "  WHERE cm.channel.id = c.id AND cm.user.id = :userId " +
        "  AND c.lastMessageId IS NOT NULL " +
        "  AND (cm.lastReadMessageId IS NULL OR cm.lastReadMessageId < c.lastMessageId)" +
        ") THEN true ELSE false END " +
        "FROM Channel c WHERE c.workspace.id = :workspaceId ...")
```

#### 배운 점
조건이 많은 기능일수록 쿼리도 더 꼼꼼하게 검토해야 하고,  
조인 방식에 따라 결과가 달라질 수 있다는 점을 배웠습니다.

---

### 4. 권한 변경 API 호출 시 500 오류가 발생한 문제

#### 상황
워크스페이스 멤버 권한 변경 요청에서 500 오류가 발생했습니다.  
확인해보니 요청 URL이 `/api/workspaces/{workspaceId}/members/NaN/role`로 들어가고 있었습니다.

#### 원인
처음에는 백엔드 코드 문제라고 생각했는데,  
멤버 목록 응답 DTO에 `userId`가 빠져 있어서  
프론트에서 path variable 값을 제대로 넣지 못하고 있었습니다.

#### 해결
응답 DTO에 `userId` 필드를 추가했습니다.

```java
public class WorkspaceMemberResponse {
    private Long userId;
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
500 오류가 발생해도 무조건 백엔드 코드부터 보기보다,  
실제 요청 URL과 값을 먼저 확인하는 습관이 중요하다는 걸 배웠습니다.

---

## 실행 방법

### 사전 준비
- Java 21
- PostgreSQL
- Redis
- Node.js / npm

### 백엔드 실행

환경변수 예시

```env
JWT_SECRET=your_secret_key
JWT_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=604800000
DB_PASSWORD=your_password
```

실행

```bash
cd backend
./gradlew build
java -jar build/libs/pulsespace.jar
```

Swagger UI

```
http://localhost:8080/swagger-ui/index.html
```

### 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

---

## 아쉬웠던 점

프로젝트를 진행하면서 기능 구현과 배포까지는 직접 해보았지만,  
아직 더 보완하고 싶은 부분도 있습니다.

- 테스트 코드 작성
- local / prod 운영 환경 설정 분리
- WebSocket 인증 실패 처리 보완
- 읽음 처리 요청값 검증 강화
- Docker 기반 배포 환경 구성

---

## 회고

이번 프로젝트를 통해 인증, 권한 관리, 실시간 통신, unread 처리 등  
백엔드에서 자주 다루는 기능을 직접 구현해볼 수 있었습니다.

특히 로컬에서 기능을 구현하는 것과,  
배포 환경에서 실제로 안정적으로 동작하게 만드는 것은 다르다는 점을 많이 느꼈습니다.  
HTTPS, CORS, WebSocket 연결, 배포 설정 등을 직접 적용하면서  
기능 외에도 함께 고려해야 할 요소가 많다는 것을 배웠습니다.

또한 조건이 많은 기능은 처음 구현하는 것보다  
실제로 붙여보고 수정하는 과정에서 더 많이 배울 수 있었습니다.

아직 부족한 점은 있지만,  
이번 프로젝트를 통해 구현부터 배포까지의 흐름을 한 번에 경험할 수 있었고,  
앞으로는 테스트와 운영 관점까지 더 탄탄하게 보완해보고 싶습니다.