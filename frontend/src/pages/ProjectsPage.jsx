import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, Search, Folder, ClipboardList, Users, Crown, Pencil, Trash2, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error"><AlertCircle size={11} />{msg}</div>;
}

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [folders, setFolders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', folder_id: '' });
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState('');

  const load = () => {
    api.get('/projects').then(r => setProjects(r.data)).catch(() => {});
    api.get('/folders').then(r => setFolders(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = {};
    const name = form.name.trim();
    if (!name) errs.name = 'Введите название проекта';
    else if (name.length > 100) errs.name = 'Максимум 100 символов';
    if (form.description.length > 500) errs.description = 'Максимум 500 символов';
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    const payload = { ...form, name };
    if (!payload.folder_id) delete payload.folder_id;
    try {
      const r = await api.post('/projects', payload);
      toast.success('Проект создан');
      navigate(`/projects/${r.data.id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить проект?')) return;
    try { await api.delete(`/projects/${id}`); toast.success('Проект удалён'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p => {
      const matchSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.owner?.name?.toLowerCase().includes(q) ||
        p.folder?.name?.toLowerCase().includes(q);
      const matchFolder = !filterFolder ||
        String(p.folder_id) === filterFolder ||
        (filterFolder === '__none__' && !p.folder_id);
      return matchSearch && matchFolder;
    });
  }, [projects, search, filterFolder]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><LayoutDashboard size={18} />Проекты</div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} />Новый проект
        </button>
      </div>

      {showForm && (
        <div className="detail-card" style={{ maxWidth: 480, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Новый проект</div>
          <form onSubmit={handleCreate} noValidate>
            <div className="form-group">
              <label className="form-label">Название <span className="form-required">*</span></label>
              <input
                className={`form-input${formErrors.name ? ' input-error' : ''}`}
                type="text"
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); if (formErrors.name) setFormErrors(p => ({ ...p, name: '' })); }}
                placeholder="Название проекта"
                maxLength={100}
              />
              <FieldError msg={formErrors.name} />
            </div>
            <div className="form-group">
              <label className="form-label">Описание</label>
              <textarea
                className={`form-input${formErrors.description ? ' input-error' : ''}`}
                value={form.description}
                onChange={e => { setForm({ ...form, description: e.target.value }); if (formErrors.description) setFormErrors(p => ({ ...p, description: '' })); }}
                rows={2}
                placeholder="Краткое описание..."
                maxLength={500}
              />
              <FieldError msg={formErrors.description} />
            </div>
            <div className="form-group">
              <label className="form-label">Папка (необязательно)</label>
              <select className="form-input" value={form.folder_id} onChange={e => setForm({ ...form, folder_id: e.target.value })}>
                <option value="">Без папки</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setFormErrors({}); }}>Отмена</button>
              <button type="submit" className="btn btn-primary">Создать</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span className="search-icon-pos"><Search size={14} /></span>
          <input className="search-input" placeholder="Поиск по названию, описанию, владельцу, папке..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
        </div>
        <select className="filter-select" value={filterFolder} onChange={e => setFilterFolder(e.target.value)}>
          <option value="">Все папки</option>
          <option value="__none__">Без папки</option>
          {folders.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {projects.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Проектов пока нет</div>
        )}
        {filtered.length === 0 && projects.length > 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Ничего не найдено</div>
        )}
        {filtered.map(p => {
          const myRole = p.members?.find(m => m.id === user?.id)?.pivot?.role;
          const isOwner = p.owner_id === user?.id || myRole === 'owner';
          const isEditor = myRole === 'editor';
          return (
            <div key={p.id} className="detail-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{p.name}</div>
              {p.description && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>{p.description}</div>}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {p.folder && (
                  <span className="chip"><Folder size={12} />{p.folder.name}</span>
                )}
                {isOwner && <span className="chip"><Crown size={12} />Владелец</span>}
                {isEditor && <span className="chip"><Pencil size={12} />Редактор</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text2)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ClipboardList size={12} />{p.tasks_count ?? 0} задач</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />{p.members_count ?? p.members?.length ?? 0} участников</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                <Link to={`/projects/${p.id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>Открыть</Link>
                {(user?.role === 'admin' || isOwner) && (
                  <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleDelete(p.id)}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
