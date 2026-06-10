/** 도메인 타입 — 백엔드 엔티티와 1:1 대응 */

export type PoiType = 'MEET' | 'SUBWAY' | 'TOILET' | 'STORE' | 'PHARMACY' | 'WATER';

export interface Poi {
  id: number;
  type: PoiType;
  name: string;
  lat: number;
  lng: number;
  memo: string | null;
  active: boolean;
}

export interface Notice {
  id: number;
  title: string;
  body: string | null;
  pinned: boolean;
  createdAt: string;
}

export interface Stream {
  id: number;
  title: string;
  url: string;
  channel: string | null;
  live: boolean;
  createdAt: string;
}

export type PostCategory = 'FREE' | 'INFO' | 'SHARE' | 'QUESTION' | 'CHEER';

export interface Post {
  id: number;
  category: PostCategory;
  nickname: string;
  title: string;
  body: string | null;
  createdAt: string;
}

/** Spring Data Page 응답 */
export interface SpringPage<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface PoisResult {
  pois: Poi[];
  source: 'server' | 'fallback';
}
