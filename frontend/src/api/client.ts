import { FALLBACK_POIS } from '../data/fallbackPois';
import type { PoisResult } from '../types';

const BASE = '/api';

/** 관리자 토큰 저장 키 — AuthContext와 공유 (401 만료 처리에서 직접 비워야 함) */
export const TOKEN_STORAGE_KEY = 'rally-admin-token';
/** 토큰이 만료/무효(401)임을 AuthContext에 알리는 이벤트 — 받으면 로그아웃 상태로 전환 */
export const AUTH_EXPIRED_EVENT = 'rally-auth-expired';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

/**
 * 공통 fetch 래퍼. 4xx/5xx는 서버 메시지를 담은 ApiError를 throw.
 * 주의: 204 No Content 응답은 null을 반환하므로, 삭제류 호출은
 * 반드시 `api<null>(...)` 또는 `api<unknown>(...)`으로 타입을 지정할 것.
 */
export async function api<T>(path: string, { method = 'GET', body, token }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // 토큰을 보내고도 401이면 만료/무효 — 저장 토큰을 비우고 AuthContext에 알려
    // 로그인 상태가 고착되거나 죽은 토큰으로 무한 재요청하는 것을 막는다.
    // (로그인 요청 자체는 token 없이 호출되므로 여기에 걸리지 않음)
    if (res.status === 401 && token) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    let message = `요청 실패 (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      message = data.error ?? data.message ?? message;
    } catch {
      /* 본문 없는 에러 응답 */
    }
    throw new ApiError(message, res.status);
  }
  return res.status === 204 ? (null as T) : ((await res.json()) as T);
}

/** POI 목록 — 서버 장애 시 내장 데이터 폴백 (현장에서 빈 화면 금지) */
export async function fetchPois(): Promise<PoisResult> {
  try {
    return { pois: await api('/pois'), source: 'server' };
  } catch {
    return { pois: FALLBACK_POIS, source: 'fallback' };
  }
}
