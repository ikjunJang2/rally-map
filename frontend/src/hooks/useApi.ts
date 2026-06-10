import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchPois } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { CctvResponse, Notice, Poi, PoisResult, Post, PostCategory, SpringPage, Stream } from '../types';

const REFRESH_MS = 60_000; // 현장 정보 1분 주기 갱신

export function usePois() {
  return useQuery<PoisResult>({
    queryKey: ['pois'],
    queryFn: fetchPois,
    refetchInterval: REFRESH_MS,
  });
}

export function useNotices() {
  return useQuery<Notice[]>({
    queryKey: ['notices'],
    queryFn: () => api('/notices'),
    refetchInterval: REFRESH_MS,
    placeholderData: [],
  });
}

export function useStreams() {
  return useQuery<Stream[]>({
    queryKey: ['streams'],
    queryFn: () => api('/streams'),
    refetchInterval: REFRESH_MS,
    placeholderData: [],
  });
}

export function useCctvs() {
  return useQuery<CctvResponse>({
    queryKey: ['cctvs'],
    queryFn: () => api('/cctvs'),
    // 카메라 목록은 백엔드가 10분 캐시 — 과한 재조회 불필요
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });
}

export function usePosts(category: PostCategory | null, page: number) {
  return useQuery<SpringPage<Post>>({
    queryKey: ['posts', category ?? 'ALL', page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (category) params.set('category', category);
      return api(`/posts?${params}`);
    },
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

export interface NewPost {
  category: PostCategory;
  nickname: string;
  pin: string;
  title: string;
  body: string;
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (post: NewPost) => api<Post>('/posts', { method: 'POST', body: post }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useDeletePostByAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pin }: { id: number; pin: string }) =>
      api<null>(`/posts/${id}/delete`, { method: 'POST', body: { pin } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

interface AdminCall {
  path: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/** 관리자 변경 작업 공통 훅 — 토큰 자동 첨부, 성공 시 해당 목록 갱신 */
export function useAdminMutation(invalidateKeys: string[]) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = 'POST', body }: AdminCall) =>
      api<unknown>(path, { method, body, token }),
    onSuccess: () =>
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: [key] })),
  });
}

/** 관리자용 POI 전체 목록 (비활성 포함) */
export function useAdminPois() {
  const { token, isAdmin } = useAuth();
  return useQuery<Poi[]>({
    queryKey: ['admin-pois'],
    queryFn: () => api('/admin/pois', { token }),
    enabled: isAdmin,
  });
}
