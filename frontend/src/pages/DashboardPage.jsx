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
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/tasks').then(r => setTasks(r.data)).catch(() => {});
    if (user?.role === 'creator') {
      api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    }
  }, [user]);

  const myTasks = tasks.filter(t => t.assignee_id === user?.id || (user?.role === 'creator'));
  const reviewTasks = tasks.filter(t => t.status === 'review');
  const todayTasks = tasks.filter(t => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Привет, {user?.name}! {user?.role === 'creator' ? '👑' : '⚡'}</h1>
          <p className="page-subtitle">
            {user?.role === 'creator' ? 'Панель управления заданиями' : `Ваш баланс: ${user?.balance ?? 0} баллов`}
          </p>
        </div>
        {user?.role === 'creator' && (
          <Link to="/tasks/new" className="btn btn-primary">+ Новая задача</Link>
        )}
      </div>

      {/* Статистика для создателя */}
      {user?.role === 'creator' && stats && (
        <div className="stats-grid">
          {[
            { icon: '👥', val: stats.users,        label: 'Исполнителей'  },
            { icon: '📋', val: stats.tasks_total,  label: 'Всего задач'   },
            { icon: '⏳', val: stats.tasks_review, label: 'На проверке'   },
            { icon: '✅', val: stats.tasks_done,   label: 'Выполнено'     },
            { icon: '💰', val: stats.points_issued,label: 'Баллов выдано' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-cols">
        {/* Задачи на проверке (для создателя) */}
        {user?.role === 'creator' && (
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

        {/* Мои задачи сегодня */}
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
          {tasks.filter(t => ['open','in_progress'].includes(t.status)).length === 0
            ? <p className="empty-state">✨ Нет активных задач</p>
            : tasks.filter(t => ['open','in_progress'].includes(t.status)).slice(0,5).map(t => <TaskCard key={t.id} task={t} />)
          }
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }) {
  const meta = STATUS_META[task.status] || {};
  return (
    <Link to={`/tasks/${task.id}`} className="task-card-link">
      <div className={`task-card-mini priority-${task.priority}`}>
        <div className="task-card-mini-title">{task.title}</div>
        <div className="task-card-mini-footer">
          <span className={`status-badge ${meta.cls}`}>{meta.label}</span>
          {task.reward_points > 0 && <span className="reward-chip">💰 {task.reward_points}</span>}
        </div>
      </div>
    </Link>
  );
}
