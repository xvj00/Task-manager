import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function FolderPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [folder, setFolder] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showInvite, setShowInvite] = useState(false);

  const load = () => api.get(`/folders/${id}`).then(r => setFolder(r.data)).catch(() => navigate('/folders'));
  useEffect(() => { load(); }, [id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/folders/${id}/invite`, { email: inviteEmail, role: inviteRole });
      toast.success('Пользователь приглашён');
      setInviteEmail(''); setShowInvite(false); load();
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

  if (!folder) return <div className="loading">Загрузка...</div>;
  const isOwner = folder.owner_id === user?.id || user?.role === 'creator';

  return (
    <div className="page page-narrow-lg">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/folders')}>← Назад</button>
        {isOwner && (
          <div className="page-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowInvite(!showInvite)}>+ Пригласить</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Удалить</button>
          </div>
        )}
      </div>

      <div className="folder-detail-header">
        <div className="folder-icon-lg">📁</div>
        <div>
          <h1>{folder.name}</h1>
          {folder.description && <p className="page-subtitle">{folder.description}</p>}
          <p className="page-subtitle">Владелец: {folder.owner?.name}</p>
        </div>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="form-card" style={{ marginBottom: 20 }}>
          <h3>Пригласить в папку</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Email пользователя</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="user@example.com" />
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

      <div className="folder-sections">
        {/* Проекты */}
        <div className="folder-section">
          <div className="dash-section-header">
            <h2>Проекты ({folder.projects?.length ?? 0})</h2>
            <Link to={`/projects/new?folder_id=${id}`} className="btn btn-primary btn-sm">+ Новый проект</Link>
          </div>
          {folder.projects?.length === 0
            ? <p className="empty-state">Проектов пока нет</p>
            : folder.projects?.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="project-row">
                <div className="project-row-icon">🗂</div>
                <div className="project-row-info">
                  <div className="project-row-name">{p.name}</div>
                  {p.description && <div className="project-row-desc">{p.description}</div>}
                </div>
                <div className="project-row-owner">👤 {p.owner?.name}</div>
              </Link>
            ))
          }
        </div>

        {/* Участники */}
        <div className="folder-section">
          <h2>Участники ({folder.members?.length ?? 0})</h2>
          <div className="members-list">
            {folder.members?.map(m => (
              <div key={m.id} className="member-row">
                <div className="member-avatar">{m.name[0].toUpperCase()}</div>
                <div className="member-info">
                  <div className="member-name">{m.name}</div>
                  <div className="member-email">{m.email}</div>
                </div>
                <span className={`role-badge ${m.pivot?.role}`}>{ROLE_LABELS[m.pivot?.role]}</span>
                {isOwner && m.id !== folder.owner_id && (
                  <button className="btn btn-danger btn-xs" onClick={() => handleRemoveMember(m.id)}>Удалить</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ROLE_LABELS = { owner: '👑 Владелец', editor: '✏️ Редактор', member: '👤 Участник' };
