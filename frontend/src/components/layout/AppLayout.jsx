import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../../store/authStore';
import BlockedPage from '../../pages/BlockedPage';

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
      <BlockedPage
        reason={user.block_reason}
        appealSubmitted={!!user.appeal_at}
      />
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
