import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, Clock, CircleCheck, Coins, CalendarClock, Flame, Plus, LayoutDashboard } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const STATUS_CLS = {
  open: 'badge-open', in_progress: 'badge-progress', review: 'badge-review',
  done: 'badge-done', rejected: 'badge-rejected', archive: 'badge-archive',
};
const STATUS_LABEL = {
  open: 'Открыта', in_progress: 'В процессе', review: 'На проверке',
  done: 'Выполнена', rejected: 'Отклонена', archive: 'Архив',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [tasks, setTasks]   = useState([]);
  const [stats, setStats]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tasksP = api.get('/tasks');
        const statsP = isAdmin ? api.get('/admin/stats') : Promise.resolve({ data: null });
        const [tasksRes, statsRes] = await Promise.all([tasksP, statsP]);
        if (cancelled) return;
        setTasks(tasksRes.data);
        if (isAdmin && statsRes.data) setStats(statsRes.data);
      } catch {
        if (!cancelled) setTasks([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const reviewTasks = tasks.filter(t => t.status === 'review');
  const myTasks     = tasks.filter(t => t.assignee_id === user?.id);
  const todayTasks  = tasks.filter(t => {
    if (!t.deadline) return false;
    if (!isAdmin && t.assignee_id !== user?.id) return false;
    return new Date(t.deadline).toDateString() === new Date().toDateString();
  });
  const activeTasks = tasks.filter(t => ['open', 'in_progress'].includes(t.status));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title"><LayoutDashboard size={18} />Привет, {user?.name}!</div>
          <div className="page-sub">{isAdmin ? 'Панель управления заданиями' : `Ваш баланс: ${user?.balance ?? 0} баллов`}</div>
        </div>
        {isAdmin && (
          <Link to="/tasks/new" className="btn btn-primary">
            <Plus size={14} /> Новая задача
          </Link>
        )}
      </div>

      {/* Stats (только admin) */}
      {isAdmin && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><Users size={18} /></div>
            <div className="stat-label">Пользователей</div>
            <div className="stat-value">{stats.users}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><ClipboardList size={18} /></div>
            <div className="stat-label">Всего задач</div>
            <div className="stat-value">{stats.tasks_total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Clock size={18} /></div>
            <div className="stat-label">На проверке</div>
            <div className="stat-value">{stats.tasks_review}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><CircleCheck size={18} color="var(--emerald)" /></div>
            <div className="stat-label">Выполнено</div>
            <div className="stat-value">{stats.tasks_done}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Coins size={18} color="var(--amber)" /></div>
            <div className="stat-label">Баллов выдано</div>
            <div className="stat-value">{stats.points_issued >= 1000 ? `${(stats.points_issued / 1000).toFixed(0)}k` : stats.points_issued}</div>
          </div>
        </div>
      )}

      {/* На проверке (admin) */}
      {isAdmin && (
        <div className="section">
          <div className="section-header">
            <span className="section-title"><Clock size={14} />На проверке</span>
            <Link to="/tasks?status=review" className="see-all">Все →</Link>
          </div>
          <div className="tasks-list">
            {reviewTasks.length === 0
              ? <div className="empty-state">Нет задач на проверке</div>
              : reviewTasks.slice(0, 5).map(t => <TaskMini key={t.id} task={t} />)
            }
          </div>
        </div>
      )}

      {/* Мои задачи (user) */}
      {!isAdmin && (
        <div className="section">
          <div className="section-header">
            <span className="section-title"><ClipboardList size={14} />Мои задачи</span>
            <Link to="/tasks" className="see-all">Все →</Link>
          </div>
          <div className="tasks-list">
            {myTasks.length === 0
              ? <div className="empty-state">Нет назначенных задач</div>
              : myTasks.slice(0, 5).map(t => <TaskMini key={t.id} task={t} />)
            }
          </div>
        </div>
      )}

      {/* Дедлайн сегодня */}
      <div className="section">
        <div className="section-header">
          <span className="section-title"><CalendarClock size={14} />Дедлайн сегодня</span>
        </div>
        <div className="tasks-list">
          {todayTasks.length === 0
            ? <div className="empty-state">Нет задач с дедлайном сегодня</div>
            : todayTasks.map(t => <TaskMini key={t.id} task={t} />)
          }
        </div>
      </div>

      {/* Активные задачи */}
      <div className="section">
        <div className="section-header">
          <span className="section-title"><Flame size={14} />Активные задачи</span>
          <Link to="/tasks" className="see-all">Все задачи →</Link>
        </div>
        <div className="tasks-list">
          {activeTasks.length === 0
            ? <div className="empty-state">Нет активных задач</div>
            : activeTasks.slice(0, 5).map(t => <TaskMini key={t.id} task={t} />)
          }
        </div>
      </div>
    </div>
  );
}

function TaskMini({ task }) {
  const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  return (
    <Link to={`/tasks/${task.id}`} className="task-mini">
      <div className="task-mini-title">{task.title}</div>
      <div className="task-meta">
        <span className={`badge ${STATUS_CLS[task.status] || ''}`}>{STATUS_LABEL[task.status]}</span>
        {task.deadline && (
          <span className="task-deadline">
            <Clock size={11} />{fmtDate(task.deadline)}
          </span>
        )}
        {task.reward_points > 0 && (
          <span className="task-reward">
            <Coins size={11} />{task.reward_points}
          </span>
        )}
      </div>
    </Link>
  );
}
