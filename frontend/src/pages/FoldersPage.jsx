import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function FoldersPage() {
  const { user } = useAuthStore();
  const [folders, setFolders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [search, setSearch] = useState('');

  const load = () => api.get('/folders').then(r => setFolders(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/folders', form);
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>📁 Папки</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Новая папка</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="form-card" style={{ marginBottom: 24, maxWidth: 480 }}>
          <h3>Новая папка</h3>
          <div className="form-group">
            <label>Название *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Название папки" />
          </div>
          <div className="form-group">
            <label>Описание</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
            <button type="submit" className="btn btn-primary">Создать</button>
          </div>
        </form>
      )}

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <input
          className="search-input"
          placeholder="🔍 Поиск по названию, описанию, владельцу..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <span className="admin-filter-count">{filtered.length} из {folders.length}</span>}
      </div>

      <div className="folders-grid">
        {folders.length === 0 && <p className="empty-state-big">📁 Папок пока нет</p>}
        {filtered.length === 0 && folders.length > 0 && <p className="empty-state-big">🔍 Ничего не найдено</p>}
        {filtered.map(f => (
          <div key={f.id} className="folder-card">
            <div className="folder-icon">📁</div>
            <div className="folder-info">
              <Link to={`/folders/${f.id}`} className="folder-name">{f.name}</Link>
              {f.description && <div className="folder-desc">{f.description}</div>}
              <div className="folder-meta">
                <span>📂 {f.projects_count} проектов</span>
                <span>👤 {f.owner?.name}</span>
              </div>
            </div>
            <div className="folder-actions">
              <Link to={`/folders/${f.id}`} className="btn btn-secondary btn-sm">Открыть</Link>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
