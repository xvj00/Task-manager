import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Folder, LayoutDashboard, User, Crown, Pencil, Plus } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const ROLE_LABELS = { owner: 'Владелец', editor: 'Редактор', member: 'Участник' };

export default function FolderPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [folder, setFolder] = useState(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showInvite, setShowInvite] = useState(false);

  const load = () => api.get(`/folders/${id}`).then(r => setFolder(r.data)).catch(() => navigate('/folders'));
  useEffect(() => { load(); }, [id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/folders/${id}/invite`, { username: inviteUsername, role: inviteRole });
      toast.success('Пользователь приглашён');
      setInviteUsername(''); setShowInvite(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleRemoveMember = async (userId) => {
    try { await api.delete(`/folders/${id}/members/${userId}`); toast.success('Участник удалён'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить папку?')) return;
    try { await api.delete(`/folders/${id}`); navigate('/folders'); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  if (!folder) return <div style={{ color: 'var(--text3)', padding: 24 }}>Загрузка...</div>;
  const isOwner = folder.owner_id === user?.id || user?.role === 'admin';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/folders')}>
          <ArrowLeft size={12} />Назад
        </button>
        <div style={{ flex: 1 }} />
        {isOwner && (
          <>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowInvite(!showInvite)}>
              <UserPlus size={12} />Пригласить
            </button>
            <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleDelete}>
              <Trash2 size={12} />Удалить
            </button>
          </>
        )}
      </div>

      <div className="page-header">
        <div>
          <div className="page-title"><Folder size={18} />{folder.name}</div>
          {folder.description && <div className="page-sub">{folder.description}</div>}
        </div>
      </div>

      {showInvite && (
        <div className="detail-card" style={{ maxWidth: 480, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Пригласить в папку</div>
          <form onSubmit={handleInvite}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Юзернейм пользователя</label>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Projects */}
        <div>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="section-title"><LayoutDashboard size={14} />Проекты ({folder.projects?.length ?? 0})</span>
            <Link to={`/projects?folder_id=${id}`} className="btn btn-primary" style={{ fontSize: 11 }}>
              <Plus size={12} />Новый проект
            </Link>
          </div>
          {folder.projects?.length === 0 ? (
            <div className="empty-state">Проектов пока нет</div>
          ) : (
            folder.projects?.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="task-mini" style={{ display: 'flex' }}>
                <div className="task-mini-title">{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={11} />{p.owner?.name}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Members */}
        <div>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <span className="section-title"><User size={14} />Участники ({folder.members?.length ?? 0})</span>
          </div>
          <div className="detail-card" style={{ padding: '8px 0' }}>
            {folder.members?.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '0.5px solid var(--border)' }}>
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>
                  {m.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>@{m.username}</div>
                </div>
                <span className="chip" style={{ fontSize: 10 }}>
                  {m.pivot?.role === 'owner' ? <Crown size={10} /> : m.pivot?.role === 'editor' ? <Pencil size={10} /> : <User size={10} />}
                  {ROLE_LABELS[m.pivot?.role]}
                </span>
                {isOwner && m.id !== folder.owner_id && (
                  <button className="btn btn-danger btn-xs" onClick={() => handleRemoveMember(m.id)}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
