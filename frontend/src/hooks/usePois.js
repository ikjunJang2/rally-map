import { useEffect, useState } from 'react';
import { fetchPois, fetchNotices } from '../api/client';

const REFRESH_MS = 60_000; // 1분마다 갱신 — 나눔처 위치 등 현장 변경 반영

export function usePois() {
  const [pois, setPois] = useState([]);
  const [source, setSource] = useState('loading');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { pois, source } = await fetchPois();
      if (alive) { setPois(pois); setSource(source); }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return { pois, source };
}

export function useNotices() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await fetchNotices();
      if (alive) setNotices(data);
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return notices;
}
