import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../../store/authStore';

export default function AppLayout() {
  const { token, user, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (!user) fetchMe().catch(() => navigate('/login'));
  }, [token]);

  if (!user) return <div className="loading-screen">Загрузка...</div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
