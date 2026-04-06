import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const STATUS_META = {
  open:        { label: '📋 Открыта',     cls: 'open'        },
  in_progress: { label: '🔄 В процессе', cls: 'in_progress' },
  review:      { label: '✅ На проверке', cls: 'review'      },
  done:        { label: '🏆 Выполнена',  cls: 'done'        },
  rejected:    { label: '❌ Отклонена',  cls: 'rejected'    },
  archive:     { label: '🗄 Архив',      cls: 'archive'     },
};

const PRIORITY_META = {
  low:    { label: 'Низкий',  cls: 'low'    },
  medium: { label: 'Средний', cls: 'medium' },
  high:   { label: 'Высокий', cls: 'high'   },
  urgent: { label: 'Срочный', cls: 'urgent' },
};

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [params] = useSearchParams();

  useEffect(() => {
    if (params.get('status')) setFilters(f => ({...f, status: params.get('status')}));
  }, []);

  const load = () => {
    const p = {};
    if (filters.status)   p.status   = filters.status;
    if (filters.priority) p.priority = filters.priority;
    if (search)           p.search   = search;
    api.get('/tasks', { params: p }).then(r => setTasks(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [filters, search]);

  const KANBAN_COLS = [
    { key: 'open',        label: '📋 Открыта'     },
    { key: 'in_progress', label: '🔄 В процессе'  },
    { key: 'review',      label: '✅ На проверке' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Задачи</h1>
        {user?.role === 'creator' && (
          <Link to="/tasks/new" className="btn btn-primary">+ Новая задача</Link>
        )}
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="🔍 Поиск по задачам..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
          <option value="">Все статусы</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})}>
          <option value="">Все приоритеты</option>
          {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="view-switcher">
          <button className={`view-btn ${view==='list'?'active':''}`} onClick={() => setView('list')}>Список</button>
          <button className={`view-btn ${view==='kanban'?'active':''}`} onClick={() => setView('kanban')}>Канбан</button>
        </div>
      </div>

      {view === 'list' && (
        <div className="tasks-list">
          {tasks.length === 0 && <div className="empty-state-big">📋 Задач не найдено</div>}
          {tasks.map(t => <TaskRow key={t.id} task={t} onUpdate={load} user={user} />)}
        </div>
      )}

      {view === 'kanban' && (
        <div className="kanban-board">
          {KANBAN_COLS.map(col => (
            <div key={col.key} className={`kanban-col ${col.key}`}>
              <div className="kanban-col-header">
                <span>{col.label}</span>
                <span className="kanban-count">{tasks.filter(t=>t.status===col.key).length}</span>
              </div>
              <div className="kanban-cards">
                {tasks.filter(t => t.status === col.key).map(t => (
                  <Link key={t.id} to={`/tasks/${t.id}`} className="kanban-card-link">
                    <div className={`kanban-card priority-${t.priority}`}>
                      <div className="kanban-card-title">{t.title}</div>
                      {t.assignee && <div className="kanban-assignee">👤 {t.assignee.name}</div>}
                      {t.deadline && <div className="kanban-deadline">📅 {new Date(t.deadline).toLocaleDateString('ru-RU')}</div>}
                      {t.reward_points > 0 && <div className="kanban-reward">💰 {t.reward_points} баллов</div>}
                    </div>
                  </Link>
                ))}
                {tasks.filter(t=>t.status===col.key).length === 0 && (
                  <div className="kanban-empty">Нет задач</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onUpdate, user }) {
  const meta = STATUS_META[task.status] || {};
  const pMeta = PRIORITY_META[task.priority] || {};

  const handleTake = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tasks/${task.id}/take`);
      toast.success('Задача взята в работу!');
      onUpdate();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tasks/${task.id}/submit`);
      toast.success('Задача отправлена на проверку!');
      onUpdate();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  return (
    <Link to={`/tasks/${task.id}`} className="task-row">
      <div className="task-row-main">
        <div className="task-row-title">{task.title}</div>
        {task.category && <span className="task-tag">{task.category}</span>}
      </div>
      <div className="task-row-meta">
        <span className={`status-badge ${meta.cls}`}>{meta.label}</span>
        <span className={`priority-badge ${pMeta.cls}`}>{pMeta.label}</span>
        {task.assignee && <span className="assignee-chip">👤 {task.assignee.name}</span>}
        {task.deadline && <span className="deadline-chip">📅 {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>}
        {task.reward_points > 0 && <span className="reward-chip">💰 {task.reward_points}</span>}
        {user?.role === 'executor' && task.status === 'open' && (
          <button className="btn btn-primary btn-xs" onClick={handleTake}>Взять в работу</button>
        )}
        {user?.role === 'executor' && task.status === 'in_progress' && task.assignee_id === user.id && (
          <button className="btn btn-success btn-xs" onClick={handleSubmit}>Выполнено ✓</button>
        )}
      </div>
    </Link>
  );
}
