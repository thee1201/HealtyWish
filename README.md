# HealthyWish

다이어터들을 위한 커뮤니티 플랫폼입니다. 사용자들은 다이어트 관련 게시글을 작성하고, 댓글을 달며, 실시간 채팅을 통해 소통할 수 있습니다.

## 기능

- **회원 관리**: 회원가입 및 로그인 (JWT 기반 인증)
- **게시판**: 다이어트 관련 게시글 작성, 조회, 좋아요 기능
- **댓글**: 게시글에 대한 댓글 작성 및 삭제
- **실시간 채팅**: 개인 및 그룹 채팅방 생성 및 메시지 송수신
- **사용자 검색**: 사용자 검색 기능

## 기술 스택

- **프론트엔드**: React (Vite), CSS
- **백엔드**: Node.js, Express
- **데이터베이스**: PostgreSQL
- **실시간 통신**: Socket.IO
- **인증**: JWT (JSON Web Token)

## 실행 방법

### 1. 데이터베이스 설정

- PostgreSQL을 설치하고 실행합니다.
- 데이터베이스 `HealthyWish`를 생성합니다.
- `server/server.js` 파일에서 데이터베이스 연결 정보를 확인하고 필요시 수정합니다.

```javascript
const client = new pg.Pool({
  host: 'localhost',
  user: 'postgres',
  password: '비밀번호',
  database: 'HealthyWish',
  port: 5432,
  max: 5,
  client_encoding: 'UTF8'
});
```

#### 데이터베이스 테이블 구조

| 테이블명            | 주요 컬럼                                                     | 설명                     |
| --------------- | --------------------------------------------------------- | ---------------------- |
| `users`          | `userID`, `username`, `password`                          | 사용자 정보 저장              |
| `posts`         | `postID`, `userID`, `title`, `contents`, `uploaddate`     | 게시글 정보 (작성자와 연결)       |
| `comments`      | `commentID`, `postID`, `userID`, `contents`, `uploaddate` | 댓글 정보 (게시글 & 작성자 연결)   |
| `like_posts`    | `userID`, `postID`                                        | 게시글 좋아요 (복합 PK로 중복 방지) |
| `chat_rooms`    | `roomID`, `groupname`, `isgroup`                          | 채팅방 정보 (그룹/1:1 여부 포함)  |
| `room_members`  | `userID`, `roomID`                                    | 채팅방 참여자 (M\:N 관계)      |
| `chat_messages` | `messageID`, `roomID`, `userID`, `message`, `timestamp`   | 채팅 메시지 정보              |

### 2. 서버 실행

- 서버 디렉토리로 이동합니다.
- 필요한 패키지를 설치합니다.

```bash
cd server
npm install
```

- 서버를 실행합니다.

```bash
npm run dev
```

- 서버는 `http://localhost:3000`에서 실행됩니다.
- 웹소켓 서버는 `http://localhost:3001`에서 실행됩니다.

### 3. 클라이언트 실행

- 클라이언트 디렉토리로 이동합니다.
- 필요한 패키지를 설치합니다.

```bash
cd client
npm install
```

- 클라이언트를 실행합니다.

```bash
npm run dev
```

- 클라이언트는 `http://localhost:5173`에서 실행됩니다.

## API 엔드포인트

### 인증
- `POST /api/auth/signup`: 회원가입
- `POST /api/auth/signin`: 로그인

### 게시글
- `GET /api/posts`: 전체 게시글 목록 조회
- `GET /api/posts/:postId`: 특정 게시물 상세 조회
- `POST /api/posts`: 게시물 생성
- `POST /api/posts/:postId/like`: 게시글 좋아요/좋아요 취소

### 사용자 게시글
- `GET /api/user/posts`: 사용자의 게시물 목록 조회
- `GET /api/like_posts`: 사용자가 좋아요한 게시물 목록 조회

### 댓글
- `POST /api/comments`: 댓글 작성
- `DELETE /api/comments/:commentId`: 댓글 삭제

### 채팅
- `GET /api/chat_rooms`: 사용자의 채팅방 목록 조회
- `POST /api/chat_rooms`: 채팅방 생성
- `GET /api/chat_rooms/:roomId/messages`: 채팅방 메시지 조회
- `GET /api/users/search`: 사용자 검색 API

## 웹소켓 이벤트

- `connection`: 웹소켓 연결
- `authenticate`: 소켓 연결 시 토큰 검증
- `join`: 채팅방 입장
- `message`: 메시지 수신 및 전송
- `disconnect`: 연결 끊김

