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
  videoId: string | null;
  channelId: string | null;
  thumbnail: string | null;
  channelThumbnail: string | null;
  viewers: number | null;
  source: 'MANUAL' | 'YOUTUBE';
  live: boolean;
  createdAt: string;
}

export interface Cctv {
  name: string;
  lat: number;
  lng: number;
  streamUrl: string;
  distanceM: number;
}

export interface CctvResponse {
  enabled: boolean;
  cameras: Cctv[];
}

export type PostCategory = 'FREE' | 'INFO' | 'SHARE' | 'QUESTION' | 'CHEER';

export interface Post {
  id: number;
  category: PostCategory;
  nickname: string;
  title: string;
  body: string | null;
  hearts: number;
  comments: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  nickname: string;
  body: string;
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
