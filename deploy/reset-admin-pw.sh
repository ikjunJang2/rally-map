#!/usr/bin/env bash
# 관리자 비밀번호 잠금 복구 — DB의 admin.pw 를 비워 .env의 RALLY_ADMIN_PASS 비밀번호로 되돌린다.
# 새 비밀번호를 잊어 로그인이 안 될 때 서버에서 실행:  bash deploy/reset-admin-pw.sh
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "1/3 초기화 플래그를 켜고 백엔드를 재기동합니다…"
ADMIN_RESET_PASSWORD=true $COMPOSE up -d backend

echo "2/3 기동(초기화 적용)을 기다립니다…"
ok=0
for _ in $(seq 1 40); do
  s=$(docker inspect -f '{{.State.Health.Status}}' rally-backend 2>/dev/null || echo none)
  if [ "$s" = "healthy" ]; then ok=1; echo "  → 백엔드 기동 완료(admin.pw 초기화됨)"; break; fi
  sleep 3
done
[ "$ok" = 1 ] || { echo "  ! 백엔드가 시간 내에 기동되지 않았습니다. 로그 확인: $COMPOSE logs --tail 80 backend"; exit 1; }

echo "3/3 플래그를 끄고 다시 기동합니다(이후 재기동 시 재초기화 방지)…"
$COMPOSE up -d backend

echo "완료 ✅  이제 .env의 RALLY_ADMIN_PASS 비밀번호로 로그인하세요. (로그인 후 관리자 → 계정에서 새 비번으로 변경)"
