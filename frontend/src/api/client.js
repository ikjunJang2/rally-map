import { FALLBACK_POIS } from '../data/fallbackPois';

const BASE = '/api';

/** 공통 fetch 래퍼. 4xx/5xx는 서버 메시지를 담아 throw. */
export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    try {
      const data = await res.json();
      message = data.error ?? data.message ?? message;
    } catch { /* 본문 없는 에러 응답 */ }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

/** POI 목록 — 서버 장애 시 내장 데이터 폴백 (현장에서 빈 화면 금지) */
export async function fetchPois() {
  try {
    return { pois: await api('/pois'), source: 'server' };
  } catch {
    return { pois: FALLBACK_POIS, source: 'fallback' };
  }
}
