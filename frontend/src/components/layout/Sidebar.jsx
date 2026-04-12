import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  House, Folder, LayoutDashboard, ClipboardList, Gift,
  Settings2, LogOut, Coins, Trophy, Menu, X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const NotificationsBell = lazy(() => import('../common/NotificationsBell'));

const NAV = [
  { path: '/',         Icon: House,           label: 'Главная',        end: true },
  { path: '/folders',  Icon: Folder,          label: 'Папки',          end: false },
  { path: '/projects', Icon: LayoutDashboard, label: 'Проекты',        end: false },
  { path: '/tasks',    Icon: ClipboardList,   label: 'Задачи',         end: false },
  { path: '/prizes',   Icon: Gift,            label: 'Витрина наград', end: false },
];

export default function Sidebar() {
  const { user, logout, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => { fetchMe().catch(() => {}); }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <button
        type="button"
        className="sidebar-burger"
        aria-label="Открыть меню"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      >
        <Menu size={20} />
      </button>
      <div
        className={`sidebar-overlay${menuOpen ? ' is-open' : ''}`}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside className={`sidebar${menuOpen ? ' sidebar--open' : ''}`}>
        <div className="logo">
          <div className="logo-text">
            <div className="logo-icon">
              <Trophy size={16} color="#fff" />
            </div>
            Таск-менеджер
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="sidebar-close-mobile"
              aria-label="Закрыть меню"
              onClick={closeMenu}
            >
              <X size={18} />
            </button>
            <Suspense fallback={<span className="bell-btn bell-btn--placeholder" aria-hidden />}>
              <NotificationsBell />
            </Suspense>
          </div>
        </div>

        <div className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              <item.Icon size={14} style={{ flexShrink: 0 }} />
              {item.label}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="nav-sep">Система</div>
              <NavLink
                to="/admin"
                onClick={closeMenu}
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <Settings2 size={14} style={{ flexShrink: 0 }} />
                Администратор
              </NavLink>
            </>
          )}
        </div>

        <div className="user-block">
          <div className="user-row">
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">@{user?.username} · {user?.role === 'admin' ? 'admin' : 'user'}</div>
            </div>
          </div>
          <div className="balance-row">
            <span className="balance-pill">
              <Coins size={12} />
              {user?.balance ?? 0} баллов
            </span>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            <LogOut size={13} />
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}
