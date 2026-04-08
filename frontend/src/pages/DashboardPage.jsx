import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const STATUS_META = {
  open:        { label: '📋 Открыта',       cls: 'open'        },
  in_progress: { label: '🔄 В процессе',    cls: 'in_progress' },
  review:      { label: '✅ На проверке',   cls: 'review'      },
  done:        { label: '🏆 Выполнена',     cls: 'done'        },
  rejected:    { label: '❌ Отклонена',     cls: 'rejected'    },
  archive:     { label: '🗄 Архив',         cls: 'archive'     },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [tasks, setTasks]           = useState([]);
  const [stats, setStats]           = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const loadOnline = () => {
    if (isAdmin) api.get('/admin/online').then(r => setOnlineUsers(r.data)).catch(() => {});
  };

  useEffect(() => {
    api.get('/tasks').then(r => setTasks(r.data)).catch(() => {});
    if (isAdmin) {
      api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
      loadOnline();
      // Обновляем список онлайн каждые 30 секунд
      const iv = setInterval(loadOnline, 30000);
      return () => clearInterval(iv);
    }
  }, [user]);

  // Мои задачи — назначенные лично мне
  const myTasks = tasks.filter(t => t.assignee_id === user?.id);

  // Задачи на проверке (видны только admin)
  const reviewTasks = tasks.filter(t => t.status === 'review');

  // Дедлайн сегодня — из назначенных мне или всех (для admin)
  const todayTasks = tasks.filter(t => {
    if (!t.deadline) return false;
    if (!isAdmin && t.assignee_id !== user?.id) return false;
    const d = new Date(t.deadline);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  // Активные задачи
  const activeTasks = tasks.filter(t => ['open', 'in_progress'].includes(t.status));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Привет, {user?.name}! {isAdmin ? '👑' : '⚡'}</h1>
          <p className="page-subtitle">
            {isAdmin ? 'Панель управления заданиями' : `Ваш баланс: ${user?.balance ?? 0} баллов`}
          </p>
        </div>
        {isAdmin && (
          <Link to="/tasks/new" className="btn btn-primary">+ Новая задача</Link>
        )}
      </div>

      {/* Статистика для admin */}
      {isAdmin && stats && (
        <div className="stats-grid">
          {[
            { icon: '👥', val: stats.users,         label: 'Пользователей' },
            { icon: '🟢', val: stats.users_online,  label: 'Сейчас онлайн', highlight: stats.users_online > 0 },
            { icon: '📋', val: stats.tasks_total,   label: 'Всего задач'   },
            { icon: '⏳', val: stats.tasks_review,  label: 'На проверке'   },
            { icon: '✅', val: stats.tasks_done,    label: 'Выполнено'     },
            { icon: '💰', val: stats.points_issued, label: 'Баллов выдано' },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.highlight ? 'stat-card-online' : ''}`}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Онлайн пользователи */}
      {isAdmin && onlineUsers.length > 0 && (
        <div className="online-users-block">
          <div className="online-users-header">
            <span className="online-dot-pulse" />
            <h3>Онлайн сейчас — {onlineUsers.length}</h3>
          </div>
          <div className="online-users-list">
            {onlineUsers.map(u => (
              <div key={u.id} className="online-user-chip">
                <div className="online-user-avatar">{u.name?.[0]?.toUpperCase()}</div>
                <div className="online-user-info">
                  <div className="online-user-name">{u.name}</div>
                  <div className="online-user-meta">
                    {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                    {' · '}
                    {lastSeenText(u.last_seen_at)}
                  </div>
                </div>
                <span className="online-indicator" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-cols">
        {/* Задачи на проверке (только admin) */}
        {isAdmin && (
          <div className="dash-section">
            <div className="dash-section-header">
              <h2>На проверке {reviewTasks.length > 0 && <span className="badge-count">{reviewTasks.length}</span>}</h2>
              <Link to="/tasks?status=review" className="link-more">Все</Link>
            </div>
            {reviewTasks.length === 0
              ? <p className="empty-state">🎉 Нет задач на проверке</p>
              : reviewTasks.slice(0, 5).map(t => <TaskCard key={t.id} task={t} />)
            }
          </div>
        )}

        {/* Мои задачи (для обычного пользователя) */}
        {!isAdmin && (
          <div className="dash-section">
            <div className="dash-section-header">
              <h2>Мои задачи {myTasks.length > 0 && <span className="badge-count">{myTasks.length}</span>}</h2>
              <Link to="/tasks" className="link-more">Все</Link>
            </div>
            {myTasks.length === 0
              ? <p className="empty-state">✨ Нет назначенных задач</p>
              : myTasks.slice(0, 5).map(t => <TaskCard key={t.id} task={t} />)
            }
          </div>
        )}

        {/* Дедлайн сегодня */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2>Дедлайн сегодня {todayTasks.length > 0 && <span className="badge-count">{todayTasks.length}</span>}</h2>
          </div>
          {todayTasks.length === 0
            ? <p className="empty-state">📅 Нет задач на сегодня</p>
            : todayTasks.map(t => <TaskCard key={t.id} task={t} />)
          }
        </div>

        {/* Активные задачи */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2>Активные задачи</h2>
            <Link to="/tasks" className="link-more">Все задачи</Link>
          </div>
          {activeTasks.length === 0
            ? <p className="empty-state">✨ Нет активных задач</p>
            : activeTasks.slice(0, 5).map(t => <TaskCard key={t.id} task={t} />)
          }
        </div>
      </div>
    </div>
  );
}

function lastSeenText(dateStr) {
  if (!dateStr) return '';
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (sec < 60)  return 'только что';
  if (sec < 3600) return `${Math.floor(sec / 60)} мин. назад`;
  return `${Math.floor(sec / 3600)} ч. назад`;
}

function TaskCard({ task }) {
  const meta = STATUS_META[task.status] || {};
  return (
    <Link to={`/tasks/${task.id}`} className="task-card-link">
      <div className={`task-card-mini priority-${task.priority}`}>
        <div className="task-card-mini-title">{task.title}</div>
        <div className="task-card-mini-footer">
          <span className={`status-badge ${meta.cls}`}>{meta.label}</span>
          {task.deadline && (
            <span className="task-card-deadline">
              📅 {new Date(task.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
          {task.reward_points > 0 && <span className="reward-chip">💰 {task.reward_points}</span>}
        </div>
      </div>
    </Link>
  );
}
