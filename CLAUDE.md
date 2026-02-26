# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 작업할 때 참고하는 가이드입니다.

## ⚠️ 중요 규칙
- **Backend 폴더는 건드리지 마세요** — Spring Boot 백엔드는 별도로 개발 중입니다
- **프론트엔드 작업만** 수행하세요 (frontend/ 디렉토리)
- Mock 모드는 제거되었으며, 실제 API 연동을 위한 코드만 유지합니다

## 프로젝트 개요

PulseSpace는 탭 기반 멀티채널 내비게이션을 갖춘 Slack 스타일 사내 메신저 웹 앱입니다. React + TypeScript 프론트엔드에 Vite를 사용합니다. 백엔드(Spring Boot)는 별도로 개발 중이며, 프론트엔드는 실제 REST API와 WebSocket 연동을 위한 코드로 구성되어 있습니다.

## 명령어

모든 명령어는 `frontend/` 디렉토리에서 실행합니다:

```bash
cd frontend

npm run dev        # Vite 개발 서버 시작 (HMR)
npm run build      # 타입 체크 (tsc -b) 후 Vite 번들링
npm run lint       # ESLint (flat config)
npm run preview    # 프로덕션 빌드 로컬 서빙
```

테스트 프레임워크는 아직 설정되지 않았습니다.

## 아키텍처

### 라우팅 (App.tsx)
- `/` → LoginPage
- `/signup` → SignupPage
- `/workspaces` → WorkspaceSelectPage
- `/workspaces/:wsId` → MainLayout (첫 번째 채널 열림)
- `/workspaces/:wsId/channels/:chId` → MainLayout (특정 채널)
- `*` → `/`로 리다이렉트
- `ProtectedRoute` 래퍼가 `authStore.token`을 확인하고, 없으면 `/`로 리다이렉트

### 레이아웃 (MainLayout)
```
┌─────────────────────────────────────────────────┐
│ TopNavBar (h-12, sticky, z-50)                  │
├─────────────────────────────────────────────────┤
│ ChannelTabBar (h-10, 드래그 재정렬)               │
├──────────┬────────────────────────┬─────────────┤
│ Channel  │ ChatWindow (flex-1)    │ MemberPanel │
│ Sidebar  │  ┌─header──────────┐  │ (w-72,      │
│ (w-60)   │  │messages (scroll)│  │  애니메이션   │
│          │  │reply indicator  │  │  토글)       │
│          │  │MessageInput     │  │             │
│          │  └─────────────────┘  │             │
└──────────┴────────────────────────┴─────────────┘
```

- **TopNavBar** — 워크스페이스 드롭다운 전환기 (Headless UI Menu), 검색 플레이스홀더 (`⌘K`), 알림 벨 + 펄스 배지, 다크/라이트 토글, 프로필 메뉴 + 로그아웃
- **ChannelTabBar** — framer-motion `Reorder.Group`으로 드래그 재정렬, `layoutId="activeTabIndicator"` 애니메이션 그라디언트 바, 이모지 아이콘, 읽지 않은 배지, 닫기 버튼, "+" 탭 추가 버튼
- **ChannelSidebar** — "자주 사용" (AI 추천: 읽지 않은 수×10 + 최근성 기준 상위 3개), 전체 채널 latestMessageAt 정렬, 접기/펼치기 그룹 (Headless UI Disclosure), 검색 필터, 이모지/해시 아이콘 + 읽지 않은 배지
- **ChatWindow** — 채널 헤더, 연결 상태 배너 (AnimatePresence), 위로 무한 스크롤 메시지 목록, 호버 액션 버튼 (답장, 이모지, 더보기), 인라인 답장 확장, 답장 표시 바, 플로팅 MessageInput
- **MemberPanel** — 멤버 목록 + 그라디언트 아바타, 온라인 표시, 역할 라벨 (관리자/멤버), AnimatePresence 애니메이션 토글

### 주요 기능

#### 탭 기반 멀티채널
- 브라우저 탭처럼 여러 채널을 동시에 열기
- framer-motion `Reorder`로 드래그 재정렬
- 활성 탭 애니메이션 그라디언트 인디케이터 (`layoutId` 스프링 애니메이션)
- 탭 닫기 시 인접한 탭으로 자동 전환
- "+" 버튼으로 사이드바 포커스하여 채널 선택
- 탭 상태는 `workspaceStore`에서 관리 (openTabs, activeTabChannelId)

#### 인라인 답장
- 메시지 호버 시 답장/이모지/더보기 액션 버튼 표시
- 답장 클릭 → `InlineReplyInput`이 메시지 아래에 확장 (AnimatePresence)
- Enter로 전송, Esc로 취소
- 답장 참조는 `CornerDownRight` 아이콘 + 보낸 사람 이름 + 미리보기로 표시
- 메인 입력창 위에 답장 표시 바 + 취소 버튼

#### 메시지 입력
- 자동 확장 textarea (최대 200px)
- 틸 색상 전송 버튼 (비어있으면 비활성)
- 도구 버튼: 파일 첨부, 이모지, 멘션 (플레이스홀더)
- 키보드 힌트: `Enter` 전송, `Shift+Enter` 줄바꿈

### API 레이어 (`src/api/`)
- 각 파일 (auth, workspace, channel, websocket)은 axios를 통한 실제 HTTP 호출로 구성
- `authHeaders()` 유틸리티는 `auth.ts`에서 export — channel.ts, workspace.ts에서 공유 사용
- 모든 요청에 JWT Bearer 토큰을 Authorization 헤더에 포함
- Mock 모드는 제거됨 — `mock.ts` 파일 삭제 완료

### WebSocket / STOMP
- SockJS 제거됨 — 프론트엔드/백엔드 양쪽 모두 native WebSocket으로 통일
  - **프론트엔드**: `sockjs-client` 패키지 제거, `@stomp/stompjs`의 `brokerURL`로 native WebSocket 사용 (`VITE_WS_BASE_URL`)
  - **백엔드**: `WebSocketConfig`에서 `.withSockJS()` 제거
  - 제거 이유: SockJS는 연결 전 `/ws/info`로 HTTP pre-flight 요청을 보내는데, Spring Security 환경에서 이 경로가 403을 반환하여 연결 불가
- `useWebSocket` 훅이 STOMP 연결 생명주기, 채널 구독, 자동 재연결 (최대 5회), 재연결 시 메시지 동기화 관리
- `sendMessage()`로 websocket.ts를 통해 메시지 전송
- 연결 배너: RECONNECTING (노란색), DISCONNECTED (빨간색), 동기화 완료 (초록색, 2초 후 자동 숨김)

### 주요 데이터 흐름
1. **채널 선택**: 사이드바 클릭 → `openTab(channel)` → REST로 메시지 로드 → STOMP 구독 → `lastReceivedMessageId` 추적
2. **재연결 동기화**: 연결 끊김 감지 → 배너 표시 → 재연결 시 `lastReceivedMessageId` 이후 메시지 조회 → `syncMessages()`로 ID 기반 중복 제거 → "동기화 완료" 배너 표시
3. **읽음 추적**: `useReadMessage` 훅이 채널 진입 시와 스크롤 하단 IntersectionObserver (디바운스 1초)로 읽음 처리
4. **무한 스크롤**: scrollTop < 100px → `getMessages(channelId, { beforeMessageId })` → `prependMessages()` → 스크롤 위치 복원

## 스토어 (Zustand)

### authStore
- `token: string | null`, `user: User | null` — localStorage에 저장
- `setAuth(token, user)`, `logout()`, `isAuthenticated()`

### workspaceStore
- `workspaces`, `currentWorkspace`, `channels`, `currentChannelId`
- `openTabs: OpenTab[]`, `activeTabChannelId: number | null` — 탭 내비게이션 상태
- `openTab(channel)` — 탭 추가 또는 이미 있으면 전환
- `closeTab(channelId)` — 탭 제거, 인접 탭으로 자동 전환
- `setActiveTab(channelId)` — 활성 탭 + currentChannelId 전환
- `reorderTabs(tabs)` — 드래그 재정렬
- `updateChannelUnread(channelId, count)`, `updateChannelLatestMessage(channelId, msg, timestamp)`

### chatStore
- `messages: Message[]`, `lastReceivedMessageId`, `connectionStatus`
- `addMessage(msg)` — ID 기반 중복 제거
- `setMessages(msgs)` — 전체 교체 (채널 전환)
- `syncMessages(msgs)` — 병합 + 중복 제거 + 정렬 (재연결)
- `prependMessages(older)` — 무한 스크롤

### themeStore
- `theme: 'dark' | 'light'` — localStorage에 저장, `<html>`에 `.dark` 클래스 적용
- `toggleTheme()`

## 타입 (`src/types/index.ts`)

- `User { id, email, name }`
- `Workspace { id, name, ownerName?, createdAt, description?, memberCount?, channelCount?, colorStart?, colorEnd?, icon? }`
- `Channel { id, workspaceId, name, visibility: 'PUBLIC'|'PRIVATE', unreadCount?, latestMessage?, latestMessageAt?, color?, description?, icon? }`
- `Message { id, channelId, senderUserId, senderName, content, createdAt, replyToId?, replyToSenderName?, replyToContent? }`
- `ChannelMember { id, channelId, userId, userName, role: 'OWNER'|'MEMBER', lastReadMessageId? }`
- `OpenTab { channelId, channelName, color, icon }`
- `ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'`

## 디자인 시스템

### 테마 (Tailwind v4 + CSS 변수)
- Tailwind v4는 `@tailwindcss/vite` 플러그인 사용 — `index.css`의 `@theme` 지시어로 설정 (tailwind.config.js 아님)
- 다크 모드: `@custom-variant dark (&:where(.dark, .dark *))`
- **다크**: 따뜻한 차콜 `#1a1625` (보라 언더톤), surface `#251e35`, elevated `#2f2740`
- **라이트**: 라벤더 `#f8f7fc`, 흰색 surface, 연보라 elevated `#f0eef5`
- **액센트**: 틸 `#14b8a6` (양 테마 공통)
- 등록된 테마 색상: `base`, `surface`, `elevated`, `line`, `primary`, `secondary`, `muted`, `accent`, `accent-hover`, `accent-light`, `success`, `warning`, `danger`

### 타이포그래피
- 폰트: Inter + Pretendard (index.html에서 CDN 로드)
- 기본 텍스트: 15px, `text-primary`

### 아이콘 & 이모지
- 아이콘: lucide-react (트리 셰이킹 지원)
- 워크스페이스 아이콘: 이모지 (💻, 📊, 🎨)
- 채널 아이콘: 이모지 (💬, 📢, 🚀, ☕, 👨‍💻 등)
- 로고: Zap 아이콘 + "pulsespace" 그라디언트 텍스트

### 애니메이션
- framer-motion: 페이지 전환, 탭 재정렬 + layoutId 인디케이터, 메시지 진입, 패널 토글, 연결 배너, 인라인 답장 확장
- CSS 트랜지션: 호버 상태, 포커스 링

### UI 라이브러리
- @headlessui/react: Menu (드롭다운), Disclosure (접기/펼치기)
- 커스텀 스크롤바: 6px 너비, 탭 바에 `.hide-scrollbar` 유틸리티

## TypeScript 설정

- strict 모드 + `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noUncheckedSideEffectImports`
- Target: ES2022, module: ESNext, bundler 모듈 해석, `verbatimModuleSyntax`
- 두 개의 tsconfig 참조: `tsconfig.app.json` (브라우저/src)과 `tsconfig.node.json` (Vite/Node 도구, ES2023)

## 주요 의존성

- React 19, React Router 7, TypeScript 5.9, Vite 7
- Zustand 5 (상태 관리), framer-motion 12 (애니메이션), @stomp/stompjs 7 (WebSocket)
- @tanstack/react-query 5, @headlessui/react 2, axios 1, date-fns 4, lucide-react

## 환경 변수

`frontend/.env`에 정의:
- `VITE_API_BASE_URL` — REST API 기본 URL (기본값: `http://localhost:8080`)
- `VITE_WS_BASE_URL` — WebSocket 엔드포인트 (기본값: `ws://localhost:8080/ws`)

## 주요 컨벤션

- React 19 + 함수형 컴포넌트 + 훅
- ESM (`"type": "module"` in package.json)
- ESLint flat config + TypeScript, React Hooks, React Refresh 규칙
- 경로 별칭: `@/`는 `src/`에 매핑 (일부 import에서 사용)
- 한국어 UI 텍스트 (메시지, 채널, 답장, 전송 등)
- 메시지는 ChatWindow.tsx에서 인라인으로 렌더링 (별도 MessageItem 컴포넌트 없음)
- 유틸리티는 `src/utils/format.ts`: `formatTime()` (오후 2:30), `relativeTime()` (3분 전), `truncate()`

## API 엔드포인트 (백엔드 연동 필요)

| 메서드 | 엔드포인트 | 설명 |
|---|---|---|
| POST | `/api/auth/login` | 로그인, `{ token, userId, email, name }` 반환 |
| POST | `/api/auth/signup` | 회원가입, 동일 형식 반환 |
| GET | `/api/workspaces` | 사용자 워크스페이스 목록 |
| POST | `/api/workspaces` | 워크스페이스 생성 |
| GET | `/api/channels/workspaces/:workspaceId/channels` | 워크스페이스 내 채널 목록 |
| POST | `/api/channels` | 채널 생성 |
| GET | `/api/messages/channels/:channelId/messages` | 메시지 목록 (`beforeMessageId`, `afterMessageId`, `limit` 파라미터 지원) |
| PATCH | `/api/messages/channels/:channelId/read` | 읽음 처리 (body: `{ messageId }`) |
| GET | `/api/channels/:channelId/members` | 채널 멤버 목록 |
| WS | `/ws` → STOMP `/topic/channels/:channelId` | 실시간 메시지 구독 |
| WS | `/ws` → STOMP `/app/messages` | 메시지 전송 (body: `{ channelId, content, replyToId }`) |
