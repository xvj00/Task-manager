import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../../store/authStore';

const BlockedPage = lazy(() => import('../../pages/BlockedPage'));

export default function AppLayout() {
  const { token, user, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (!user) fetchMe().catch(() => navigate('/login'));
  }, [token]);

  if (!user) return <div className="loading-screen">Загрузка...</div>;

  if (user.is_blocked) {
    return (
      <Suspense fallback={<div className="loading-screen">Загрузка...</div>}>
        <BlockedPage
          reason={user.block_reason}
          appealSubmitted={!!user.appeal_at}
        />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="screen">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
