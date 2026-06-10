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

export type ItemStatus = 'PLENTY' | 'LOW' | 'OUT';

export interface ShareItemView {
  id: number;
  name: string;
  status: ItemStatus;
  updatedAt: string;
}

export interface ShareLocation {
  poiId: number;
  name: string;
  lat: number;
  lng: number;
  type: PoiType;
  items: ShareItemView[];
}

/** 관리자용 평면 품목 (poiId 포함) */
export interface AdminShareItem {
  id: number;
  poiId: number;
  name: string;
  status: ItemStatus;
  updatedAt: string;
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

export interface Law {
  name: string;
  link: string;
  dept: string;
  date: string;
}

export interface LawResponse {
  enabled: boolean;
  laws: Law[];
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
  /* 임시조치(망법 44조의2) — true면 서버가 내용을 가려서 내려보냄 */
  blocked: boolean;
  /* 소프트 삭제 이력 — 관리자 감사 조회에서만 의미 있음 */
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: 'AUTHOR' | 'ADMIN' | null;
}

export type ReportTargetType = 'POST' | 'COMMENT';
export type ReportReason = 'DEFAMATION' | 'ABUSE' | 'SPAM' | 'ELECTION' | 'PRIVACY' | 'OTHER';

export interface AdminReport {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  detail: string | null;
  createdAt: string;
  targetTitle?: string;
  targetBody?: string;
  targetDeleted?: boolean;
  targetBlocked?: boolean;
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
