import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, List, ClipboardList, Columns3, Plus, Coins, Clock, User } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const STATUS_CLS   = { open:'badge-open', in_progress:'badge-progress', review:'badge-review', done:'badge-done', rejected:'badge-rejected', archive:'badge-archive' };
const STATUS_LABEL = { open:'Открыта', in_progress:'В процессе', review:'На проверке', done:'Выполнена', rejected:'Отклонена', archive:'Архив' };
const PRIORITY_CLS   = { low:'badge-low', medium:'badge-medium', high:'badge-high', urgent:'badge-urgent' };
const PRIORITY_LABEL = { low:'Низкий', medium:'Средний', high:'Высокий', urgent:'Срочный' };

const KANBAN_COLS = [
  { key: 'open',        label: 'Открытые' },
  { key: 'in_progress', label: 'В процессе' },
  { key: 'review',      label: 'На проверке' },
];

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks]   = useState([]);
  const [view, setView]     = useState('list');
  const [search, setSearch] = useState('');
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ status: params.get('status') || '', priority: '' });

  const load = () => {
    const p = {};
    if (filters.status)   p.status   = filters.status;
    if (filters.priority) p.priority = filters.priority;
    if (search)           p.search   = search;
    api.get('/tasks', { params: p }).then(r => setTasks(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [filters, search]);

  const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title"><ClipboardList size={18} />Задачи</div>
        {user?.role === 'admin' && (
          <Link to="/tasks/new" className="btn btn-primary"><Plus size={14} />Новая задача</Link>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrap">
          <span className="search-icon-pos"><Search size={14} /></span>
          <input
            className="search-input"
            placeholder="Поиск задач..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">Все приоритеты</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="view-toggle">
          <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>
            <List size={13} />Список
          </button>
          <button className={`view-btn${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>
            <Columns3 size={13} />Канбан
          </button>
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Задача</th>
                <th>Статус</th>
                <th>Приоритет</th>
                <th>Исполнитель</th>
                <th>Дедлайн</th>
                <th>Баллы</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px' }}>Задач не найдено</td></tr>
              )}
              {tasks.map(t => (
                <TaskRow key={t.id} task={t} onUpdate={load} user={user} fmtDate={fmtDate} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="section" style={{ marginTop: 4 }}>
          <div className="kanban">
            {KANBAN_COLS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.key);
              return (
                <div key={col.key} className="kanban-col">
                  <div className="kanban-col-header">
                    <span className="kanban-col-title">{col.label}</span>
                    <span className="kanban-count">{colTasks.length}</span>
                  </div>
                  {colTasks.length === 0 && <div className="kanban-empty">Нет задач</div>}
                  {colTasks.map(t => (
                    <Link key={t.id} to={`/tasks/${t.id}`} className="kanban-card">
                      <div className="kanban-card-title">{t.title}</div>
                      <div className="kanban-card-footer">
                        <div className="kanban-assign">
                          {t.assignee ? (
                            <><div className="avatar-xs">{t.assignee.name[0]}</div>{t.assignee.name.split(' ')[0]}</>
                          ) : (
                            <><User size={11} />Не назначен</>
                          )}
                        </div>
                        {t.deadline && (
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                            {new Date(t.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onUpdate, user, fmtDate }) {
  const handleTake = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { await api.post(`/tasks/${task.id}/take`); toast.success('Задача взята в работу!'); onUpdate(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };
  const handleSubmit = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { await api.post(`/tasks/${task.id}/submit`); toast.success('Отправлено на проверку!'); onUpdate(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <tr style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/tasks/${task.id}`}>
      <td>
        <div style={{ fontWeight: 500 }}>{task.title}</div>
        {task.category && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{task.category}</div>}
      </td>
      <td><span className={`badge ${STATUS_CLS[task.status]}`}>{STATUS_LABEL[task.status]}</span></td>
      <td><span className={`badge ${PRIORITY_CLS[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span></td>
      <td>
        {task.assignee ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="avatar-xs">{initials(task.assignee.name)}</div>
            <span style={{ fontSize: 12 }}>{task.assignee.name.split(' ')[0]}</span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Не назначен</span>
        )}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text2)' }}>
        {task.deadline ? fmtDate(task.deadline) : '—'}
      </td>
      <td style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>
        {task.reward_points > 0 ? task.reward_points : '—'}
      </td>
      <td onClick={e => e.stopPropagation()}>
        {user?.role !== 'admin' && task.status === 'open' && task.assignee_id !== user?.id && (
          <button className="btn btn-primary btn-xs" onClick={handleTake}>Взять</button>
        )}
        {user?.role !== 'admin' && task.status === 'in_progress' && task.assignee_id === user?.id && (
          <button className="btn btn-ghost btn-xs" onClick={handleSubmit}>На проверку</button>
        )}
        {user?.role === 'admin' && task.status === 'review' && (
          <Link to={`/tasks/${task.id}`} className="btn btn-ghost btn-xs" onClick={e => e.stopPropagation()}>Проверить</Link>
        )}
      </td>
    </tr>
  );
}
