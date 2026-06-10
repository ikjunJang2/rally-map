import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fetchPois } from '../api/client';
import { useAuth } from '../context/AuthContext';

const REFRESH_MS = 60_000; // 현장 정보 1분 주기 갱신

export function usePois() {
  return useQuery({
    queryKey: ['pois'],
    queryFn: fetchPois,
    refetchInterval: REFRESH_MS,
  });
}

export function useNotices() {
  return useQuery({
    queryKey: ['notices'],
    queryFn: () => api('/notices'),
    refetchInterval: REFRESH_MS,
    placeholderData: [],
  });
}

export function useStreams() {
  return useQuery({
    queryKey: ['streams'],
    queryFn: () => api('/streams'),
    refetchInterval: REFRESH_MS,
    placeholderData: [],
  });
}

export function usePosts(category, page) {
  return useQuery({
    queryKey: ['posts', category ?? 'ALL', page],
    queryFn: () => {
      const params = new URLSearchParams({ page });
      if (category) params.set('category', category);
      return api(`/posts?${params}`);
    },
    refetchInterval: REFRESH_MS,
    keepPreviousData: true,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (post) => api('/posts', { method: 'POST', body: post }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useDeletePostByAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pin }) => api(`/posts/${id}/delete`, { method: 'POST', body: { pin } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

/** 관리자 변경 작업 공통 훅 — 토큰 자동 첨부, 성공 시 해당 목록 갱신 */
export function useAdminMutation(invalidateKeys) {
  const { token } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = 'POST', body }) => api(path, { method, body, token }),
    onSuccess: () =>
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: [key] })),
  });
}

/** 관리자용 POI 전체 목록 (비활성 포함) */
export function useAdminPois() {
  const { token, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-pois'],
    queryFn: () => api('/admin/pois', { token }),
    enabled: isAdmin,
  });
}
