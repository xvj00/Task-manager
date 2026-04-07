import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const STATUS_META = {
  open:        { label: 'Открыта',     cls: 'open'        },
  in_progress: { label: 'В процессе',  cls: 'in_progress' },
  review:      { label: 'На проверке', cls: 'review'      },
  done:        { label: 'Выполнена',   cls: 'done'        },
  rejected:    { label: 'Отклонена',   cls: 'rejected'    },
  archive:     { label: 'Архив',       cls: 'archive'     },
};

const ROLE_LABELS = { owner: '👑 Владелец', editor: '✏️ Редактор', member: '👤 Участник' };

const KANBAN_COLS = [
  { key: 'open',        label: '📋 Открыта'     },
  { key: 'in_progress', label: '🔄 В процессе'  },
  { key: 'review',      label: '✅ На проверке' },
  { key: 'done',        label: '🏆 Выполнена'   },
];

export default function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [view, setView] = useState('list');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');

  const load = () => api.get(`/projects/${id}`).then(r => setProject(r.data)).catch(() => navigate('/projects'));
  useEffect(() => { load(); }, [id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post(`/projects/${id}/invite`, { username: inviteUsername, role: inviteRole });
      toast.success(r.data.message); setInviteUsername(''); setShowInvite(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const loadInviteLink = async () => {
    if (inviteLink) { setInviteLink(''); return; }
    const r = await api.get(`/projects/${id}/invite-link`);
    setInviteLink(`${window.location.origin}/invite/${r.data.invite_token}`);
  };

  const copyLink = () => { navigator.clipboard.writeText(inviteLink); toast.success('Ссылка скопирована!'); };

  const resetLink = async () => {
    await api.delete(`/projects/${id}/invite-link`);
    toast.success('Ссылка сброшена'); setInviteLink(''); loadInviteLink();
  };

  const handleRemoveMember = async (userId) => {
    try { await api.delete(`/projects/${id}/members/${userId}`); toast.success('Участник удалён'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить проект?')) return;
    try { await api.delete(`/projects/${id}`); navigate('/projects'); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  if (!project) return <div className="loading">Загрузка...</div>;

  const isOwner   = project.owner_id === user?.id || user?.role === 'creator';
  const myRole    = project.members?.find(m => m.id === user?.id)?.pivot?.role;
  const canManage = isOwner || myRole === 'editor';
  const tasks     = project.tasks || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            {project.folder && <><Link to={`/folders/${project.folder.id}`}>📁 {project.folder.name}</Link> / </>}
            <span>🗂 {project.name}</span>
          </div>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div className="page-actions">
          {canManage && <button className="btn btn-secondary btn-sm" onClick={() => setShowInvite(!showInvite)}>👤 Пригласить</button>}
          {canManage && <button className="btn btn-secondary btn-sm" onClick={loadInviteLink}>🔗 Ссылка</button>}
          {isOwner && <button className="btn btn-danger btn-sm" onClick={handleDelete}>Удалить</button>}
          {canManage && <Link to={`/tasks/new?project_id=${id}`} className="btn btn-primary">+ Задача</Link>}
        </div>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="form-card" style={{ marginBottom: 20 }}>
          <h3>Пригласить по юзернейму</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Юзернейм</label>
              <input type="text" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} required placeholder="@username" />
            </div>
            <div className="form-group">
              <label>Роль</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="editor">Редактор</option>
                <option value="member">Участник</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Отмена</button>
            <button type="submit" className="btn btn-primary">Пригласить</button>
          </div>
        </form>
      )}

      {inviteLink && (
        <div className="invite-link-box">
          <span className="invite-link-label">🔗 Ссылка-приглашение:</span>
          <input readOnly value={inviteLink} className="invite-link-input" onClick={e => e.target.select()} />
          <button className="btn btn-secondary btn-sm" onClick={copyLink}>Копировать</button>
          <button className="btn btn-danger btn-sm" onClick={resetLink}>Сбросить</button>
        </div>
      )}

      <div className="project-stats">
        {[
          { label: 'Всего задач', val: tasks.length },
          { label: 'Открытых', val: tasks.filter(t => t.status === 'open').length },
          { label: 'В процессе', val: tasks.filter(t => t.status === 'in_progress').length },
          { label: 'Выполнено', val: tasks.filter(t => t.status === 'done').length },
          { label: 'Участников', val: project.members?.length ?? 0 },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="view-switcher">
          <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Список</button>
          <button className={`view-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Канбан</button>
          <button className={`view-btn ${view === 'members' ? 'active' : ''}`} onClick={() => setView('members')}>Участники</button>
        </div>
      </div>

      {view === 'list' && (
        <div className="tasks-list">
          {tasks.length === 0 && <p className="empty-state-big">📋 Задач пока нет</p>}
          {tasks.map(t => (
            <Link key={t.id} to={`/tasks/${t.id}`} className="task-row">
              <div className="task-row-main">
                <div className="task-row-title">{t.title}</div>
              </div>
              <div className="task-row-meta">
                <span className={`status-badge ${STATUS_META[t.status]?.cls}`}>{STATUS_META[t.status]?.label}</span>
                {t.assignee && <span className="assignee-chip">👤 {t.assignee.name}</span>}
                {t.deadline && <span className="deadline-chip">📅 {new Date(t.deadline).toLocaleDateString('ru-RU')}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {view === 'kanban' && (
        <div className="kanban-board">
          {KANBAN_COLS.map(col => (
            <div key={col.key} className={`kanban-col ${col.key}`}>
              <div className="kanban-col-header">
                <span>{col.label}</span>
                <span className="kanban-count">{tasks.filter(t => t.status === col.key).length}</span>
              </div>
              <div className="kanban-cards">
                {tasks.filter(t => t.status === col.key).map(t => (
                  <Link key={t.id} to={`/tasks/${t.id}`} className="kanban-card-link">
                    <div className={`kanban-card priority-${t.priority}`}>
                      <div className="kanban-card-title">{t.title}</div>
                      {t.assignee && <div className="kanban-assignee">👤 {t.assignee.name}</div>}
                      {t.deadline && <div className="kanban-deadline">📅 {new Date(t.deadline).toLocaleDateString('ru-RU')}</div>}
                    </div>
                  </Link>
                ))}
                {tasks.filter(t => t.status === col.key).length === 0 && <div className="kanban-empty">Нет задач</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'members' && (
        <div className="members-list">
          {project.members?.map(m => (
            <div key={m.id} className="member-row">
              <div className="member-avatar">{m.name[0].toUpperCase()}</div>
              <div className="member-info">
                <div className="member-name">{m.name}</div>
                <div className="member-email">{m.email}</div>
              </div>
              <span className={`role-badge ${m.pivot?.role}`}>{ROLE_LABELS[m.pivot?.role]}</span>
              {isOwner && m.id !== project.owner_id && (
                <button className="btn btn-danger btn-xs" onClick={() => handleRemoveMember(m.id)}>Удалить</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
