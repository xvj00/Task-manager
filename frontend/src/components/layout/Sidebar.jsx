import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import NotificationsBell from '../common/NotificationsBell';

const NAV = [
  { path: '/',            icon: '🏠', label: 'Главная'        },
  { path: '/folders',     icon: '📁', label: 'Папки'          },
  { path: '/projects',    icon: '🗂', label: 'Проекты'        },
  { path: '/tasks',       icon: '📋', label: 'Задачи'         },
  { path: '/balance',     icon: '💰', label: 'Мой баланс'     },
  { path: '/prizes',      icon: '🎁', label: 'Витрина наград' },
  { path: '/leaderboard', icon: '🏆', label: 'Лидерборд'      },
];

const CREATOR_NAV = [
  { path: '/admin',        icon: '⚙️',  label: 'Панель создателя'},
];

export default function Sidebar() {
  const { user, logout, fetchMe } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Refresh user data (balance) every 60 seconds
  useEffect(() => {
    const iv = setInterval(() => { fetchMe().catch(() => {}); }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';

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

        {user?.role === 'creator' && (
          <>
            <div className="nav-divider">Управление</div>
            {CREATOR_NAV.map(n => (
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
            <div className="user-role">{user?.role === 'creator' ? '👑 Создатель' : '⚡ Исполнитель'}</div>
          </div>
        </div>
        {user?.role === 'executor' && (
          <div className="sidebar-balance">
            💰 <strong>{user?.balance ?? 0}</strong> баллов
          </div>
        )}
        <button className="btn-logout" onClick={handleLogout}>Выйти</button>
      </div>
    </aside>
  );
}
