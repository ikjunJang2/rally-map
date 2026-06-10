# 🕊️ 집회 한 장 지도 (Rally One-Page Map)

집회 참가 시민을 위한 현장 정보 서비스.
화장실 · 편의점 · 지하철 출구 · 집결지 · 물품 나눔처를 **한 화면 지도**에 보여주고,
긴급 연락처 원터치 전화와 권리·안전 안내를 제공합니다.

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
frontend/   React 19 + Vite — 모바일 전용 (480px 앱 프레임, 하단 탭바)
            React Router(라우팅) + TanStack Query(서버 상태) + Context(관리자 인증)
            react-leaflet 위성/일반 지도
backend/    Spring Boot + JPA + H2
            공개 API: 시설·공지·라이브 조회, 커뮤니티 글
            관리자 API: HMAC 토큰 로그인 → 모든 데이터 CRUD
```

### 화면

| 경로 | 내용 |
|---|---|
| `/` | 위성/일반 지도 + 시설 카드 (클릭 시 지도 이동) |
| `/live` | 현장 라이브 목록, 유튜브 라이브 검색, 교통 CCTV |
| `/community` | 시민 게시판 — 카테고리(자유·정보·나눔·질문·응원), 익명+PIN |
| `/call` | 원터치 긴급 전화 |
| `/guide` | 권리·안전·교통 안내 |
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

## API

**공개 API**

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/pois` | 시설 목록 (`?type=TOILET` 등 필터) |
| GET | `/api/notices` | 공지 목록 (고정 공지 우선) |
| GET | `/api/streams` | 현장 라이브 영상 목록 (LIVE 우선) |
| GET | `/api/posts` | 커뮤니티 글 (`?category=SHARE&page=0`) |
| POST | `/api/posts` | 글 작성 (닉네임 + 삭제용 PIN) |
| POST | `/api/posts/{id}/delete` | 작성자 본인 삭제 (PIN 확인) |
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

## 배포 전 체크리스트

- [ ] `RALLY_ADMIN_PASS`·`RALLY_TOKEN_SECRET` 강한 값으로 설정
- [ ] HTTPS 리버스프록시 (Caddy/Traefik/CloudFlare) 앞단 구성
- [ ] 긴급 연락처 유효성 확인 (민변 사무처 02-522-7284 등)
- [ ] 트래픽 급증 대비 시 H2 → PostgreSQL 전환
