# 🕊️ 주권자의 광장

> **"대한민국의 주권은 국민에게 있고, 모든 권력은 국민으로부터 나온다."**
> — 대한민국 헌법 제1조 2항

광장에 모인 시민을 위한 현장 정보 서비스.
화장실 · 편의점 · 지하철 출구 · 모임터 · 물품 나눔처를 **한 화면 지도**에 보여주고,
현장 라이브 · 시민 커뮤니티 · 긴급 연락처 · 권리·안전 안내를 제공합니다.

현재 대상: **SK올림픽핸드볼경기장** (올림픽공원, 송파구 올림픽로 424) 일대
— 좌표 데이터는 OpenStreetMap 실측 기반.

## 설계 원칙

| 원칙 | 구현 |
|---|---|
| 개인정보 제로 | 로그인·추적기·위치수집 없음. 서버는 시설/공지 데이터만 보관 |
| 현장 통신 장애 대비 | 서버 다운 시 프론트 내장 데이터로 폴백, 빈 화면 없음 |
| 접근성 | 큰 글씨 토글, 다크모드, 원터치 전화 |
| 실시간성 | 주최 측 공지 API — 참가자 화면에 1분 내 반영 |

## 구조

```
frontend/   React 19 + TypeScript(strict) + Vite — 모바일 전용 (480px 앱 프레임, 하단 탭바)
            React Router(lazy 라우트 스플리팅) + TanStack Query(서버 상태) + Context(인증·테마·토스트)
            react-leaflet 위성/일반 지도, PWA(오프라인 타일·API 캐시), ErrorBoundary, 스켈레톤 로딩
backend/    Spring Boot + JPA + H2
            공개 API: 시설·공지·라이브 조회, 커뮤니티 글
            관리자 API: HMAC 토큰 로그인 → 모든 데이터 CRUD
```

### 화면

| 경로 | 내용 |
|---|---|
| `/` | 위성/일반 지도 + 시설 카드 (클릭 시 지도 이동) |
| `/live` | 현장 라이브 목록, 유튜브 라이브 검색, 교통 CCTV |
| `/community` | 시민 게시판 — 카테고리·댓글·하트·인기글 TOP3, 익명+PIN |
| `/call` | 원터치 긴급 전화 |
| `/guide` | 현장 안내 + 권리·법률 (핵심 조문 원문, 법령 검색) |
| `/admin` | 관리자 로그인 → 시설·공지·라이브 관리 |

## 로컬 개발

```bash
# 백엔드 (8080)
cd backend && ./mvnw spring-boot:run

# 프론트엔드 (5173, /api는 8080으로 프록시)
cd frontend && npm install && npm run dev
```

## 배포 (Docker)

```bash
cp .env.example .env   # RALLY_ADMIN_KEY를 강한 값으로 교체
docker compose up -d --build
```

→ `http://서버주소` 접속. H2 데이터는 `rally-data` 볼륨에 보존됩니다.

### 운영 배포 (도메인 + 자동 HTTPS)

운영 도메인: **https://www.63freedom.com** (63freedom.com은 www로 리다이렉트)

DNS에서 `www.63freedom.com`·`63freedom.com` A 레코드를 서버 IP로 연결한 뒤:

```bash
WEB_PORT=127.0.0.1:8081 docker compose --profile prod up -d --build
```

Caddy가 80/443을 받아 Let's Encrypt 인증서를 자동 발급·갱신합니다
(도메인 변경 시 [deploy/Caddyfile](deploy/Caddyfile) 수정).
`WEB_PORT=127.0.0.1:8081`은 프론트 컨테이너가 공개 80포트를 점유하지 않게 하는 설정입니다.

## API

**공개 API**

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/pois` | 시설 목록 (`?type=TOILET` 등 필터) |
| GET | `/api/notices` | 공지 목록 (고정 공지 우선) |
| GET | `/api/streams` | 현장 라이브 목록 — 유튜브 자동 수집분 포함 (썸네일·채널) |
| GET | `/api/cctvs` | 경기장 주변 교통 CCTV 목록 + HLS 스트림 URL |
| GET | `/api/posts` | 커뮤니티 글 (`?category=SHARE&page=0`) |
| POST | `/api/posts` | 글 작성 (닉네임+PIN, 금칙어·도배 자동 차단) |
| GET | `/api/posts/popular` | 인기글 TOP 3 (하트순) |
| POST | `/api/posts/{id}/like` | 하트 토글 (세션당 1회) |
| GET/POST | `/api/posts/{id}/comments` | 댓글 조회·작성 (검열 동일 적용) |
| POST | `/api/posts/{id}/delete` | 작성자 본인 삭제 (PIN 확인) |

**커뮤니티 운영 정책** (코드로 강제):
닉네임 2–12자 · 제목 80자 · 본문 1,000자 · 댓글 300자 ·
글 분당 1건/시간당 10건 · 댓글 분당 3건 · 링크 최대 2개 ·
동일 제목 10분 내 재등록 차단 · 금칙어(욕설·위협·스팸) 자동 거부.
금칙어 사전: `backend/src/main/resources/moderation-banned-words.txt`
— 정규화(공백·특수문자·숫자 제거) 후 부분일치라 "시1발" 류 우회도 차단.

**삭제 = 소프트 삭제 + 기간 후 파기**: 글·댓글은 삭제해도 내용·삭제 시각·삭제 주체가
이력으로 보존되다가 **보존 기간(기본 180일, `COMMUNITY_RETENTION_DAYS`) 경과 시 배치가 완전 파기**합니다
(개인정보보호법 21조 파기 의무 — 보존 정책은 /privacy에 고지됨). 공개 API에는 노출되지 않으며
관리자만 [삭제 이력] 탭에서 조회.

**신고·임시조치 (정보통신망법 44조의2)**: 모든 글·댓글에 신고 버튼 → 관리자 [신고] 탭 대기열
→ 임시조치(30일 가림, 서버단 마스킹)/삭제/처리완료. 임시조치된 자리에는 조치 사실이 표시됨.

**법적 고지**: `/privacy`(개인정보처리방침)·`/terms`(이용약관) — YouTube API 필수 고지
(YouTube ToS·Google 개인정보처리방침 링크) 포함. 운영자 연락처는 `frontend/src/config.ts`의
`CONTACT_EMAIL` — **도메인 등록 후 실제 수신 가능한 메일로 설정할 것**.

**개인정보 제로 인프라**: nginx `access_log off`(방문 IP 미기록), X-Real-IP 미전달,
Docker 로그 10MB×3 회전, 종료 유튜브 방송 48시간 후 자동 삭제(YouTube API 30일 제한 준수).
| POST | `/api/auth/login` | 관리자 로그인 → 토큰 발급 (12시간) |

**관리자 API** — `Authorization: Bearer {토큰}` 필수

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/admin/pois[/{id}]` | 시설 CRUD (숨김 포함) |
| POST/DELETE | `/api/admin/notices[/{id}]` | 공지 등록·삭제 |
| POST/PATCH/DELETE | `/api/admin/streams[/{id}]` | 라이브 등록·종료·삭제 |
| DELETE | `/api/admin/posts/{id}` | 커뮤니티 글 관리자 삭제 |

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"..."}' | jq -r .token)

curl -X POST http://localhost:8080/api/admin/notices \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"물 나눔처 위치 변경","body":"동2문 안쪽으로 이동","pinned":false}'
```

## 다른 장소로 바꾸려면

1. `backend/.../config/DataSeeder.java` 의 좌표 교체 (출처: OpenStreetMap)
2. `frontend/src/data/fallbackPois.js` 를 동일하게 맞춤 (CENTER 포함)

## 자동 연동 (선택 — 키만 넣으면 켜짐)

| 환경변수 | 발급처 | 효과 |
|---|---|---|
| `YOUTUBE_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) → YouTube Data API v3 | 라이브 방송 자동 수집 (검색 15분 간격, 라이브 상태 1분 간격 확인). 썸네일·제목·채널 카드 표시 |
| `ITS_API_KEY` | [its.go.kr/opendata](https://www.its.go.kr/opendata/opendataList?service=cctv) | 경기장 주변 2km 교통 CCTV를 앱 안에서 실시간 재생 (HLS) |
| `LAW_OC` | [open.law.go.kr](https://open.law.go.kr) (가입 이메일 ID가 곧 키) | 안내 탭에서 법령 검색 결과를 앱 안에 표시. 미설정 시 law.go.kr 링크 폴백 |

쿼터 참고: 유튜브 search.list는 호출당 100유닛(일일 무료 10,000).
검색 간격을 1분으로 줄이면 하루를 못 버티므로 기본값(15분 검색 + 1분 상태 확인)을 유지할 것.
프론트는 1분마다 서버 캐시를 읽으므로 사용자는 1분 단위 최신 목록을 본다.

## 배포 전 체크리스트

- [ ] `RALLY_ADMIN_PASS`·`RALLY_TOKEN_SECRET` 강한 값으로 설정
- [ ] HTTPS 리버스프록시 (Caddy/Traefik/CloudFlare) 앞단 구성
- [ ] 긴급 연락처 유효성 확인 (민변 사무처 02-522-7284 등)
- [ ] 트래픽 급증 대비 시 H2 → PostgreSQL 전환
