import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, UserPlus, LinkIcon, Plus, Trash2, Users, Columns3, List, User, Crown, Pencil, BarChart2, Medal, CircleCheck, Coins } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const STATUS_CLS   = { open: 'badge-open', in_progress: 'badge-progress', review: 'badge-review', done: 'badge-done', rejected: 'badge-rejected', archive: 'badge-archive' };
const STATUS_LABEL = { open: 'Открыта', in_progress: 'В процессе', review: 'На проверке', done: 'Выполнена', rejected: 'Отклонена', archive: 'Архив' };

const KANBAN_COLS = [
  { key: 'open',        label: 'Открытые' },
  { key: 'in_progress', label: 'В процессе' },
  { key: 'review',      label: 'На проверке' },
];

const ROLE_LABELS = { owner: 'Владелец', editor: 'Редактор', member: 'Участник' };

export default function ProjectPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [view, setView] = useState('list');
  const [leaders, setLeaders] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLinkRole, setInviteLinkRole] = useState('member');

  const load = () => api.get(`/projects/${id}`).then(r => setProject(r.data)).catch(() => navigate('/projects'));
  const loadLeaders = () => api.get(`/projects/${id}/leaderboard`).then(r => setLeaders(r.data)).catch(() => {});
  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (view === 'leaderboard') loadLeaders(); }, [view, id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    const un = inviteUsername.trim().replace(/^@/, '');
    if (!un) { toast.error('Введите никнейм пользователя'); return; }
    if (!/^[a-zA-Z0-9_]{2,30}$/.test(un)) { toast.error('Никнейм: 2–30 символов, буквы/цифры/_'); return; }
    try {
      const r = await api.post(`/projects/${id}/invite`, { username: un, role: inviteRole });
      toast.success(r.data.message); setInviteUsername(''); setShowInvite(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const loadInviteLink = async (role) => {
    const params = role ? `?role=${role}` : '';
    const r = await api.get(`/projects/${id}/invite-link${params}`);
    setInviteLink(`${window.location.origin}/invite/${r.data.invite_token}`);
    setInviteLinkRole(r.data.invite_link_role || 'member');
  };

  const copyLink = () => { navigator.clipboard.writeText(inviteLink); toast.success('Ссылка скопирована!'); };
  const resetLink = async () => { await api.delete(`/projects/${id}/invite-link`); toast.success('Ссылка сброшена'); setInviteLink(''); };

  const handleRemoveMember = async (userId) => {
    try { await api.delete(`/projects/${id}/members/${userId}`); toast.success('Участник удалён'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить проект?')) return;
    try { await api.delete(`/projects/${id}`); navigate('/projects'); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  if (!project) return <div style={{ color: 'var(--text3)', padding: 24 }}>Загрузка...</div>;

  const isOwner   = project.owner_id === user?.id || user?.role === 'admin';
  const myRole    = project.members?.find(m => m.id === user?.id)?.pivot?.role;
  const canManage = isOwner || myRole === 'editor';
  const tasks     = project.tasks || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ marginBottom: 4 }}>
            <LayoutDashboard size={18} />{project.name}
          </div>
          {project.folder && (
            <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Link to={`/folders/${project.folder.id}`} style={{ color: 'var(--indigo)' }}>{project.folder.name}</Link>
              {project.description && <> · {project.description}</>}
            </div>
          )}
          {!project.folder && project.description && <div className="page-sub">{project.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowInvite(!showInvite)}>
              <UserPlus size={12} />Пригласить
            </button>
          )}
          {canManage && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => inviteLink ? setInviteLink('') : loadInviteLink()}>
              <LinkIcon size={12} />Ссылка
            </button>
          )}
          {canManage && (
            <Link to={`/tasks/new?project_id=${id}`} className="btn btn-primary" style={{ fontSize: 12 }}>
              <Plus size={12} />Задача
            </Link>
          )}
          {isOwner && (
            <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleDelete}>
              <Trash2 size={12} />Удалить
            </button>
          )}
        </div>
      </div>

      {showInvite && (
        <div className="detail-card" style={{ maxWidth: 480, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Пригласить по юзернейму</div>
          <form onSubmit={handleInvite}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Юзернейм</label>
                <input className="form-input" type="text" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} required placeholder="@username" />
              </div>
              <div className="form-group">
                <label className="form-label">Роль</label>
                <select className="form-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="editor">Редактор</option>
                  <option value="member">Участник</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowInvite(false)}>Отмена</button>
              <button type="submit" className="btn btn-primary">Пригласить</button>
            </div>
          </form>
        </div>
      )}

      {inviteLink && (
        <div className="detail-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <LinkIcon size={13} />Ссылка-приглашение
          </div>
          <div style={{ marginBottom: 8 }}>
            <label className="form-label">Роль приглашённых:</label>
            <select className="form-input" style={{ marginTop: 4 }} value={inviteLinkRole} onChange={e => loadInviteLink(e.target.value)}>
              <option value="member">Пользователь — просматривает, берёт задачи</option>
              <option value="editor">Соавтор — создаёт задачи, приглашает</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" readOnly value={inviteLink} onClick={e => e.target.select()} style={{ flex: 1, fontSize: 12 }} />
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={copyLink}>Копировать</button>
            <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={resetLink}>Сбросить</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Задач</div><div className="stat-value">{tasks.length}</div></div>
        <div className="stat-card"><div className="stat-label">Открытых</div><div className="stat-value">{tasks.filter(t => t.status === 'open').length}</div></div>
        <div className="stat-card"><div className="stat-label">В процессе</div><div className="stat-value">{tasks.filter(t => t.status === 'in_progress').length}</div></div>
        <div className="stat-card"><div className="stat-label">Выполнено</div><div className="stat-value">{tasks.filter(t => t.status === 'done').length}</div></div>
        <div className="stat-card"><div className="stat-label">Участников</div><div className="stat-value">{project.members?.length ?? 0}</div></div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>
          <List size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Список
        </button>
        <button className={`tab${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')}>
          <Columns3 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Канбан
        </button>
        <button className={`tab${view === 'members' ? ' active' : ''}`} onClick={() => setView('members')}>
          <Users size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Участники
        </button>
        <button className={`tab${view === 'leaderboard' ? ' active' : ''}`} onClick={() => setView('leaderboard')}>
          <BarChart2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Лидерборд
        </button>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Задача</th>
                <th>Статус</th>
                <th>Исполнитель</th>
                <th>Дедлайн</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Задач пока нет</td></tr>
              )}
              {tasks.map(t => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.id}`)}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td><span className={`badge ${STATUS_CLS[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                  <td>
                    {t.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div className="avatar-xs">{t.assignee.name[0]}</div>
                        <span style={{ fontSize: 12 }}>{t.assignee.name.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>Не назначен</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {t.deadline ? new Date(t.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
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
      )}

      {/* Leaderboard view */}
      {view === 'leaderboard' && (() => {
        const MEDAL_COLORS = ['#d97706', '#94a3b8', '#a16207'];
        const MEDAL_SIZES  = [18, 16, 14];
        return leaders.length === 0 ? (
          <div className="empty-state">Пока нет данных</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {leaders.map((u, i) => {
              const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const isMe = u.id === user?.id;
              return (
                <div key={u.id} className={`leaderboard-row${isMe ? ' me' : ''}`}>
                  <div className="rank">
                    {i < 3 ? (
                      <Medal size={MEDAL_SIZES[i]} color={MEDAL_COLORS[i]} />
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>#{i + 1}</span>
                    )}
                  </div>
                  <div className="avatar">{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {u.name}
                      {isMe && <span style={{ fontSize: 11, color: 'var(--indigo)', marginLeft: 6 }}>(Вы)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>@{u.username}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CircleCheck size={12} />{u.completed_tasks} задач
                    </span>
                    <span style={{ fontSize: 13, color: '#92400e', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Coins size={12} />{u.balance}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Members view */}
      {view === 'members' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Имя</th><th>@Никнейм</th><th>Роль</th><th></th></tr>
            </thead>
            <tbody>
              {project.members?.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div className="avatar-xs">{m.name[0].toUpperCase()}</div>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>@{m.username}</td>
                  <td>
                    <span className="chip" style={{ fontSize: 10 }}>
                      {m.pivot?.role === 'owner' ? <Crown size={10} /> : m.pivot?.role === 'editor' ? <Pencil size={10} /> : <User size={10} />}
                      {ROLE_LABELS[m.pivot?.role]}
                    </span>
                  </td>
                  <td>
                    {isOwner && m.id !== project.owner_id && (
                      <button className="btn btn-danger btn-xs" onClick={() => handleRemoveMember(m.id)}>
                        <Trash2 size={11} />Удалить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
