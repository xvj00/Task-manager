import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  House, Folder, LayoutDashboard, ClipboardList, Gift,
  Settings2, LogOut, Coins, Trophy, Bell
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import NotificationsBell from '../common/NotificationsBell';

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

  useEffect(() => {
    const iv = setInterval(() => { fetchMe().catch(() => {}); }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <aside className="sidebar">
      {/* Logo + bell */}
      <div className="logo">
        <div className="logo-text">
          <div className="logo-icon">
            <Trophy size={16} color="#fff" />
          </div>
          Artem List
        </div>
        <NotificationsBell />
      </div>

      {/* Nav */}
      <div className="nav">
        {NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
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
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <Settings2 size={14} style={{ flexShrink: 0 }} />
              Администратор
            </NavLink>
          </>
        )}
      </div>

      {/* User block */}
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
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={13} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
