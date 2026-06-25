/** 도메인 타입 — 백엔드 엔티티와 1:1 대응 */

export type PoiType = 'MEET' | 'SUBWAY' | 'TOILET' | 'STORE' | 'PHARMACY' | 'WATER' | 'SHELTER';

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
export type ShareCategory = 'WATER' | 'FOOD' | 'WARM' | 'MEDICAL' | 'RAIN' | 'ETC';

export interface ShareItemView {
  id: number;
  name: string;
  status: ItemStatus;
  category: ShareCategory;
  quantity: string | null;
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
  category: ShareCategory;
  quantity: string | null;
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
  /** 키는 있으나 ITS 업스트림 조회 실패(지연·차단) — '없음'과 구분 */
  error?: boolean;
}

export interface CongestionForecast {
  time: string;
  level: string;
  min: number | null;
  max: number | null;
}

export interface Congestion {
  enabled: boolean;
  area: string | null;
  /** 여유 · 보통 · 약간 붐빔 · 붐빔 */
  level: string | null;
  message: string | null;
  min: number | null;
  max: number | null;
  time: string | null;
  /** 키는 있으나 서울 API 조회 실패 */
  error: boolean;
  forecast: CongestionForecast[];
}

export interface Law {
  name: string;
  mst: string;
  dept: string;
  date: string;
}

export interface LawResponse {
  enabled: boolean;
  laws: Law[];
}

export interface LawArticle {
  no: string;
  content: string;
}

export interface LawDetail {
  enabled: boolean;
  name: string;
  articles: LawArticle[];
}

/** 관리자 외부 연동 키 설정 */
export interface AppSetting {
  key: string;
  label: string;
  help: string;
  secret: boolean;
  set: boolean;
  value: string;
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

// ── 웹툰 ──
export interface ToonSeriesCard { id: number; title: string; author: string; summary: string; episodes: number; coverImageId: number | null; }
export interface ToonEpisodeItem { id: number; no: number; title: string; }
export interface ToonSeriesDetail { id: number; title: string; author: string; summary: string; episodes: ToonEpisodeItem[]; }
export interface ToonEpisodeView { id: number; no: number; title: string; seriesId: number; images: number[]; }
export interface AdminToonSeries { id: number; title: string; author: string; summary: string; published: boolean; episodes: number; }
export interface AdminToonEpisode { id: number; no: number; title: string; published: boolean; images: number[]; }

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
