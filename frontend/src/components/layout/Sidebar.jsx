import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import NotificationsBell from '../common/NotificationsBell';

const NAV = [
  { path: '/',            icon: '🏠', label: 'Главная'        },
  { path: '/folders',     icon: '📁', label: 'Папки'          },
  { path: '/projects',    icon: '🗂', label: 'Проекты'        },
  { path: '/tasks',       icon: '📋', label: 'Задачи'         },
  { path: '/prizes',      icon: '🎁', label: 'Витрина наград' },
  { path: '/leaderboard', icon: '🏆', label: 'Лидерборд'      },
];

const ADMIN_NAV = [
  { path: '/admin', icon: '⚙️', label: 'Администратор' },
];

export default function Sidebar() {
  const { user, logout, fetchMe } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const iv = setInterval(() => { fetchMe().catch(() => {}); }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <div className="logo">🏆 Artem List</div>
          <NotificationsBell />
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(n => (
          <Link key={n.path} to={n.path} className={`nav-item ${location.pathname === n.path ? 'active' : ''}`}>
            <span className="nav-icon">{n.icon}</span> {n.label}
          </Link>
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="nav-divider">Система</div>
            {ADMIN_NAV.map(n => (
              <Link key={n.path} to={n.path} className={`nav-item nav-creator ${location.pathname.startsWith(n.path) ? 'active' : ''}`}>
                <span className="nav-icon">{n.icon}</span> {n.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role" style={{ fontSize: 11 }}>
              @{user?.username} · {user?.role === 'admin' ? '🛡 Администратор' : '👤 Пользователь'}
            </div>
          </div>
        </div>
        <div className="sidebar-balance">
          💰 <strong>{user?.balance ?? 0}</strong> баллов
        </div>
        <button className="btn-logout" onClick={handleLogout}>Выйти</button>
      </div>
    </aside>
  );
}
