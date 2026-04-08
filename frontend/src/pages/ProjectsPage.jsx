import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [folders, setFolders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', folder_id: '' });
  const [search, setSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState('');

  const load = () => {
    api.get('/projects').then(r => setProjects(r.data)).catch(() => {});
    api.get('/folders').then(r => setFolders(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = { ...form };
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
    <div className="page">
      <div className="page-header">
        <h1>🗂 Проекты</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Новый проект</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="form-card" style={{ marginBottom: 24, maxWidth: 480 }}>
          <h3>Новый проект</h3>
          <div className="form-group">
            <label>Название *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Название проекта" />
          </div>
          <div className="form-group">
            <label>Описание</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="form-group">
            <label>Папка (необязательно)</label>
            <select value={form.folder_id} onChange={e => setForm({ ...form, folder_id: e.target.value })}>
              <option value="">Без папки</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
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
          placeholder="🔍 Поиск по названию, описанию, владельцу, папке..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="admin-filter-select"
          value={filterFolder}
          onChange={e => setFilterFolder(e.target.value)}
        >
          <option value="">Все папки</option>
          <option value="__none__">Без папки</option>
          {folders.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
        </select>
        {(search || filterFolder) && (
          <span className="admin-filter-count">{filtered.length} из {projects.length}</span>
        )}
      </div>

      <div className="projects-list">
        {projects.length === 0 && <p className="empty-state-big">🗂 Проектов пока нет</p>}
        {filtered.length === 0 && projects.length > 0 && <p className="empty-state-big">🔍 Ничего не найдено</p>}
        {filtered.map(p => (
          <div key={p.id} className="project-card">
            <div className="project-card-left">
              <div className="project-card-icon">🗂</div>
              <div>
                <Link to={`/projects/${p.id}`} className="project-card-name">{p.name}</Link>
                {p.description && <div className="project-card-desc">{p.description}</div>}
                <div className="project-card-meta">
                  {p.folder && <span className="project-folder-chip">📁 {p.folder.name}</span>}
                  <span>📋 {p.tasks_count} задач</span>
                  <span>👤 {p.owner?.name}</span>
                </div>
              </div>
            </div>
            <div className="project-card-actions">
              <Link to={`/projects/${p.id}`} className="btn btn-secondary btn-sm">Открыть</Link>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
