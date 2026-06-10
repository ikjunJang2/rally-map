#!/usr/bin/env bash
# 주권자의 광장 — EC2(Ubuntu) 운영 배포 부트스트랩
# 사용: 저장소 클론 후 `bash deploy/setup.sh`
# Docker 설치 → .env 생성(시크릿 서버에서 자동 생성) → Cloudflare Tunnel로 기동
set -euo pipefail

cd "$(dirname "$0")/.."   # 저장소 루트로 이동

echo "==> 주권자의 광장 배포 시작"

# ── 1. Docker 설치 확인 ───────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Docker 설치 중…"
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
  echo "   Docker 설치 완료 (그룹 적용을 위해 재로그인이 필요할 수 있음)"
fi

DC="docker compose"
$DC version >/dev/null 2>&1 || DC="docker-compose"

# ── 2. .env 생성 (없을 때만) ──────────────────────────
if [ -f .env ]; then
  echo "==> 기존 .env 발견 — 그대로 사용 (시크릿 재생성 원하면 .env 삭제 후 재실행)"
else
  echo "==> .env 생성 — 시크릿은 이 서버에서 자동 생성됩니다 (채팅·git에 안 남음)"
  echo

  read -rp "관리자 아이디: " ADMIN_USER
  while true; do
    read -rsp "관리자 비밀번호(직접 입력, 강하게): " ADMIN_PASS; echo
    read -rsp "한 번 더 확인: " ADMIN_PASS2; echo
    [ "$ADMIN_PASS" = "$ADMIN_PASS2" ] && break
    echo "   비밀번호가 일치하지 않아요. 다시 입력하세요."
  done

  echo
  echo "Cloudflare 터널 토큰을 붙여넣으세요 (대시보드에서 발급, eyJ... 로 시작):"
  read -rp "TUNNEL_TOKEN: " TUNNEL_TOKEN

  echo
  echo "(선택) 외부 연동 키 — 없으면 Enter로 건너뛰기:"
  read -rp "YOUTUBE_API_KEY: " YT_KEY || true
  read -rp "ITS_API_KEY(CCTV): " ITS_KEY || true
  read -rp "LAW_OC(법령검색): " LAW_OC || true

  # 기계 전용 시크릿은 암호학적 난수로 자동 생성 (사람이 볼 필요 없음)
  TOKEN_SECRET="$(openssl rand -hex 48)"
  DB_PASSWORD="$(openssl rand -hex 24)"

  cat > .env <<EOF
# 운영 시크릿 — 절대 커밋·공유 금지. 이 서버에서 자동 생성됨.
RALLY_ADMIN_USER=${ADMIN_USER}
RALLY_ADMIN_PASS=${ADMIN_PASS}
RALLY_TOKEN_SECRET=${TOKEN_SECRET}
DB_PASSWORD=${DB_PASSWORD}
TUNNEL_TOKEN=${TUNNEL_TOKEN}
YOUTUBE_API_KEY=${YT_KEY:-}
ITS_API_KEY=${ITS_KEY:-}
LAW_OC=${LAW_OC:-}
EOF
  chmod 600 .env
  echo "==> .env 생성 완료 (권한 600)"
fi

# ── 3. 빌드 + 기동 ────────────────────────────────────
echo "==> 컨테이너 빌드·기동 중… (첫 빌드는 수 분 소요)"
$DC -f docker-compose.prod.yml up -d --build

echo
echo "==> 완료. 상태 확인:"
$DC -f docker-compose.prod.yml ps
echo
echo "터널이 연결되면 https://www.63freedom.com 으로 열립니다."
echo "로그 보기:  $DC -f docker-compose.prod.yml logs -f cloudflared"
