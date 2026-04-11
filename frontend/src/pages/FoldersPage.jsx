import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, Search, Folder, LayoutDashboard, Trash2, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error"><AlertCircle size={11} />{msg}</div>;
}

export default function FoldersPage() {
  const [folders, setFolders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [search, setSearch] = useState('');

  const load = () => api.get('/folders').then(r => setFolders(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = {};
    const name = form.name.trim();
    if (!name) errs.name = 'Введите название папки';
    else if (name.length > 100) errs.name = 'Максимум 100 символов';
    if (form.description.length > 300) errs.description = 'Максимум 300 символов';
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    try {
      await api.post('/folders', { ...form, name });
      toast.success('Папка создана');
      setShowForm(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить папку и все проекты внутри?')) return;
    try { await api.delete(`/folders/${id}`); toast.success('Папка удалена'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return folders;
    return folders.filter(f =>
      f.name?.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q) ||
      f.owner?.name?.toLowerCase().includes(q)
    );
  }, [folders, search]);

  const FOLDER_COLORS = ['var(--indigo)', 'var(--amber)', 'var(--emerald)', 'var(--violet)', 'var(--rose)'];

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><FolderOpen size={18} />Папки</div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} />Новая папка
        </button>
      </div>

      {showForm && (
        <div className="detail-card" style={{ maxWidth: 480, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Новая папка</div>
          <form onSubmit={handleCreate} noValidate>
            <div className="form-group">
              <label className="form-label">Название <span className="form-required">*</span></label>
              <input
                className={`form-input${formErrors.name ? ' input-error' : ''}`}
                type="text"
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); if (formErrors.name) setFormErrors(p => ({ ...p, name: '' })); }}
                placeholder="Название папки"
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
                maxLength={300}
              />
              <FieldError msg={formErrors.description} />
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
          <input className="search-input" placeholder="Поиск папок..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {folders.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Папок пока нет</div>
        )}
        {filtered.length === 0 && folders.length > 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Ничего не найдено</div>
        )}
        {filtered.map((f, idx) => (
          <div key={f.id} className="detail-card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Folder size={22} color={FOLDER_COLORS[idx % FOLDER_COLORS.length]} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</div>
            </div>
            {f.description && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>{f.description}</div>}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <LayoutDashboard size={12} />{f.projects_count ?? 0} проектов · {f.owner?.name}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Link to={`/folders/${f.id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>Открыть</Link>
              <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleDelete(f.id)}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
