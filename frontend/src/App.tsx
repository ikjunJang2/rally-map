import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Skeleton from './components/Skeleton';

// 라우트 단위 코드 스플리팅 — 지도(leaflet) 같은 무거운 페이지는 필요할 때만 로드
const MapPage = lazy(() => import('./pages/MapPage'));
const LivePage = lazy(() => import('./pages/LivePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const AnthemPage = lazy(() => import('./pages/AnthemPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const ToonPage = lazy(() => import('./pages/ToonPage'));

function Loading() {
  return (
    <>
      <Skeleton lines={2} />
      <Skeleton lines={4} />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Suspense fallback={<Loading />}><MapPage /></Suspense>} />
        <Route path="live" element={<Suspense fallback={<Loading />}><LivePage /></Suspense>} />
        <Route path="community" element={<Suspense fallback={<Loading />}><CommunityPage /></Suspense>} />
        <Route path="call" element={<Suspense fallback={<Loading />}><EmergencyPage /></Suspense>} />
        <Route path="guide" element={<Suspense fallback={<Loading />}><GuidePage /></Suspense>} />
        <Route path="admin" element={<Suspense fallback={<Loading />}><AdminPage /></Suspense>} />
        <Route path="privacy" element={<Suspense fallback={<Loading />}><PrivacyPage /></Suspense>} />
        <Route path="terms" element={<Suspense fallback={<Loading />}><TermsPage /></Suspense>} />
        <Route path="feedback" element={<Suspense fallback={<Loading />}><FeedbackPage /></Suspense>} />
        <Route path="anthem" element={<Suspense fallback={<Loading />}><AnthemPage /></Suspense>} />
        <Route path="board" element={<Suspense fallback={<Loading />}><BoardPage /></Suspense>} />
        <Route path="toon" element={<Suspense fallback={<Loading />}><ToonPage /></Suspense>} />
        <Route path="toon/:seriesId" element={<Suspense fallback={<Loading />}><ToonPage /></Suspense>} />
        <Route path="toon/:seriesId/:episodeId" element={<Suspense fallback={<Loading />}><ToonPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
