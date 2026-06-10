import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MapPage from './pages/MapPage';
import LivePage from './pages/LivePage';
import CommunityPage from './pages/CommunityPage';
import EmergencyPage from './pages/EmergencyPage';
import GuidePage from './pages/GuidePage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MapPage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="call" element={<EmergencyPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
