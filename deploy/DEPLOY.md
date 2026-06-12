# 배포 가이드 — EC2 + Cloudflare Tunnel

운영 도메인: **https://www.63freedom.com**
아키텍처: EC2(Docker) ← Cloudflare Tunnel(아웃바운드) ← Cloudflare 엣지 ← 사용자
→ **서버 IP가 외부에 노출되지 않고, 개방 포트는 SSH(22) 하나뿐.**

---

## 1단계 — EC2 인스턴스 생성 (AWS 콘솔)

1. AWS 콘솔 → **EC2** → 리전을 **서울(ap-northeast-2)** 로 설정
2. **인스턴스 시작**
   - 이름: `rally-map`
   - AMI: **Ubuntu Server 24.04 LTS**
   - 인스턴스 유형: **t3.small** (2GB RAM — 백엔드+프론트+터널에 적정)
   - 키 페어: **새로 생성** → `.pem` 다운로드해서 잘 보관 (SSH 접속에 필요)
   - 네트워크 설정 → **보안 그룹**:
     - SSH(22): **내 IP** 만 허용 (소스를 "내 IP"로 — 아무나 SSH 못 하게)
     - HTTP/HTTPS는 **열지 않음** (터널이라 불필요)
   - 스토리지: 20GB, **암호화 켜기**(Encryption: enabled)
3. **인스턴스 시작** → 잠시 후 **퍼블릭 IP** 확인 (SSH 접속용으로만 씀)

---

## 2단계 — Cloudflare Tunnel 생성 (Cloudflare 대시보드)

1. Cloudflare 대시보드 → 좌측 **Zero Trust** (없으면 무료 가입, 결제수단 등록은 하되 무료 플랜)
2. **Networks → Tunnels → Create a tunnel**
   - 유형: **Cloudflared**
   - 이름: `rally-map`
   - **Save** → 다음 화면에서 **터널 토큰**(`eyJ...`로 시작하는 긴 문자열)이 보임 → **복사해 둠**
     (설치 명령 중 `--token eyJ...` 부분이 토큰)
3. **Public Hostnames(공개 호스트네임) 추가** — 같은 화면에서:
   - **호스트네임 1**: Subdomain `www`, Domain `63freedom.com`,
     Service **Type: HTTP**, URL: `frontend:80`
   - **Add** → 한 번 더 **호스트네임 2**: Subdomain 비움, Domain `63freedom.com`,
     Service **HTTP**, URL: `frontend:80`
   - 저장하면 Cloudflare가 **DNS(CNAME)를 자동 생성** — A 레코드 수동 입력 불필요
4. (권장) Cloudflare → **SSL/TLS → Overview → Full (strict)**,
   **Edge Certificates → Always Use HTTPS = ON, HSTS = Enable**

---

## 3단계 — 서버에서 배포 (SSH)

```bash
# 로컬에서 SSH 접속 (키 경로·IP는 본인 것으로)
ssh -i rally-map.pem ubuntu@<EC2-퍼블릭-IP>

# 저장소 클론
git clone https://github.com/ikjunJang2/rally-map.git
cd rally-map

# 배포 스크립트 실행 — Docker 설치 + .env 생성 + 기동
bash deploy/setup.sh
```

스크립트가 물어보는 것:
- **관리자 아이디 / 비밀번호** — 직접 입력 (강하게, 이 채팅에 없는 새 값으로)
- **TUNNEL_TOKEN** — 2단계에서 복사한 `eyJ...` 붙여넣기
- **YOUTUBE_API_KEY / ITS_API_KEY / LAW_OC** — 있으면 입력, 없으면 Enter로 건너뜀
- 토큰 비밀·DB 암호화 키는 **서버가 자동 생성** (사람이 볼 필요 없음)

Docker 그룹 권한 때문에 첫 실행 후 `permission denied`가 나면, **한 번 로그아웃 후 재접속**하고 `bash deploy/setup.sh` 다시 실행.

---

## 4단계 — 확인

```bash
docker compose -f docker-compose.prod.yml ps        # 세 컨테이너 healthy/Up
docker compose -f docker-compose.prod.yml logs -f cloudflared   # "Registered tunnel connection" 뜨면 연결됨
```

브라우저에서 **https://www.63freedom.com** 접속 → 앱이 뜨면 완료.

---

## 운영 메모

- **업데이트**: `git pull && docker compose -f docker-compose.prod.yml up -d --build`
- **재시작**: `docker compose -f docker-compose.prod.yml restart`
- **중지**: `docker compose -f docker-compose.prod.yml down`
- **백업**: `rally-data` 볼륨(H2 암호화 DB). `docker run --rm -v rally-map_rally-data:/d -v $PWD:/b alpine tar czf /b/backup.tgz /d`
- **시크릿 변경**: `.env` 수정 후 `up -d` 재실행. `.env`는 절대 커밋 금지(권한 600).
- **외부 키 발급 후 추가**: `.env`에 키 넣고 `up -d` 재실행하면 유튜브·CCTV·법령 기능 활성화.
