import { FALLBACK_POIS } from '../data/fallbackPois';

const BASE = '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/** POI 목록. 서버 장애 시 내장 데이터로 폴백 — 현장에서 절대 빈 화면을 보여주지 않는다. */
export async function fetchPois() {
  try {
    const pois = await get('/pois');
    return { pois, source: 'server' };
  } catch {
    return { pois: FALLBACK_POIS, source: 'fallback' };
  }
}

/** 공지 목록. 실패 시 빈 배열. */
export async function fetchNotices() {
  try {
    return await get('/notices');
  } catch {
    return [];
  }
}
