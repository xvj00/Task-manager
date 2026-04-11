import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PlusCircle, Check, Paperclip, X, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

function getFileIcon(mime) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return '📦';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('excel') || mime.includes('sheet')) return '📊';
  return '📄';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / 1024 / 1024).toFixed(1) + ' МБ';
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="field-error">
      <AlertCircle size={11} />{msg}
    </div>
  );
}

export default function CreateEditTaskPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('project_id');
  const fileInputRef = useRef();

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    title: '', description: '', deadline: '', priority: 'medium',
    assignee_id: '', reward_points: 0, category: '',
    project_id: projectIdFromUrl || '',
  });

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
      api.get('/projects').then(r => setProjects(r.data)).catch(() => {});
    } else {
      api.get('/projects').then(r => setProjects(r.data)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    const pid = projectIdFromUrl || form.project_id;
    if (!pid) {
      setUsers([]);
      return;
    }
    api.get(`/projects/${pid}`).then(r => setUsers(r.data.members || [])).catch(() => setUsers([]));
  }, [user, projectIdFromUrl, form.project_id]);

  useEffect(() => {
    if (!isEdit || !id) return;
    api.get(`/tasks/${id}`).then(r => {
      const t = r.data;
      setForm({
        title: t.title, description: t.description || '',
        deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 16) : '',
        priority: t.priority, assignee_id: t.assignee_id || '',
        reward_points: t.reward_points, category: t.category || '',
        project_id: t.project_id != null ? String(t.project_id) : (projectIdFromUrl || ''),
      });
    }).catch(() => navigate(-1));
  }, [id, isEdit, navigate, projectIdFromUrl]);

  const upd = f => e => {
    setForm(prev => ({ ...prev, [f]: e.target.value }));
    if (errors[f]) setErrors(prev => ({ ...prev, [f]: '' }));
  };

  const validate = () => {
    const errs = {};
    const title = form.title.trim();
    if (!title) {
      errs.title = 'Название обязательно';
    } else if (title.length < 3) {
      errs.title = 'Минимум 3 символа';
    } else if (title.length > 150) {
      errs.title = 'Максимум 150 символов';
    }

    const pts = Number(form.reward_points);
    if (form.reward_points === '' || form.reward_points === null) {
      errs.reward_points = 'Укажите количество баллов';
    } else if (!Number.isInteger(pts) || pts < 0) {
      errs.reward_points = 'Баллы: целое число ≥ 0';
    } else if (pts > 100000) {
      errs.reward_points = 'Максимум 100 000 баллов';
    }

    if (form.deadline) {
      const dl = new Date(form.deadline);
      if (isNaN(dl.getTime())) {
        errs.deadline = 'Некорректная дата';
      } else if (!isEdit && dl <= new Date()) {
        errs.deadline = 'Дедлайн должен быть в будущем';
      }
    }

    if (form.category && form.category.length > 50) {
      errs.category = 'Максимум 50 символов';
    }

    if (user?.role !== 'admin' && !isEdit) {
      const pid = String(form.project_id || projectIdFromUrl || '').trim();
      if (!pid) errs.project_id = 'Выберите проект';
    }

    return errs;
  };

  const onFilesSelected = (e) => {
    const selected = Array.from(e.target.files);
    const oversized = selected.filter(f => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`Файл слишком большой: ${oversized[0].name} (макс. 10 МБ)`);
    }
    const ok = selected.filter(f => f.size <= 10 * 1024 * 1024);
    setPendingFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...ok.filter(f => !existing.has(f.name + f.size))];
    });
    e.target.value = '';
  };

  const removeFile = (index) => setPendingFiles(prev => prev.filter((_, i) => i !== index));

  const uploadFiles = async (taskId) => {
    for (const file of pendingFiles) {
      const fd = new FormData();
      fd.append('file', file);
      try { await api.post(`/tasks/${taskId}/attachments`, fd); }
      catch { toast.error(`Не удалось загрузить: ${file.name}`); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // scroll to first error
      const firstKey = Object.keys(errs)[0];
      document.querySelector(`[data-field="${firstKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setErrors({});
    const payload = {
      ...form,
      title: form.title.trim(),
      category: form.category.trim(),
      reward_points: Number(form.reward_points),
      project_id: form.project_id || projectIdFromUrl || '',
    };
    if (!payload.assignee_id) delete payload.assignee_id;
    if (!payload.deadline)    delete payload.deadline;
    if (isEdit) delete payload.project_id;
    else if (!payload.project_id) delete payload.project_id;
    else payload.project_id = Number(payload.project_id);
    if (!payload.category)    delete payload.category;
    setUploading(true);
    try {
      if (isEdit) {
        await api.put(`/tasks/${id}`, payload);
        if (pendingFiles.length > 0) await uploadFiles(id);
        toast.success('Задача обновлена');
        navigate(`/tasks/${id}`);
      } else {
        const r = await api.post('/tasks', payload);
        const newId = r.data.id;
        if (pendingFiles.length > 0) await uploadFiles(newId);
        toast.success('Задача создана');
        const navPid = payload.project_id;
        navigate(navPid ? `/projects/${navPid}` : `/tasks/${newId}`);
      }
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        const mapped = {};
        Object.entries(serverErrors).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      } else {
        toast.error(err.response?.data?.message || 'Ошибка сохранения');
      }
    } finally {
      setUploading(false);
    }
  };

  const backUrl = projectIdFromUrl ? `/projects/${projectIdFromUrl}` : (isEdit ? `/tasks/${id}` : '/tasks');

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <PlusCircle size={18} />{isEdit ? 'Редактирование задачи' : 'Создание задачи'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => navigate(backUrl)} disabled={uploading}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading}>
            <Check size={14} />{uploading ? (pendingFiles.length > 0 ? 'Загрузка...' : 'Сохранение...') : (isEdit ? 'Сохранить' : 'Создать задачу')}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div className="detail-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" data-field="title">
              <label className="form-label">Название <span className="form-required">*</span></label>
              <input
                className={`form-input${errors.title ? ' input-error' : ''}`}
                type="text"
                value={form.title}
                onChange={upd('title')}
                maxLength={150}
                placeholder="Введите название задачи"
              />
              <FieldError msg={errors.title} />
            </div>

            <div className="form-group">
              <label className="form-label">Описание</label>
              <textarea className="form-input" value={form.description} onChange={upd('description')} placeholder="Опишите задачу..." />
            </div>

            {user?.role !== 'admin' && !isEdit && (
              <div className="form-group" data-field="project_id">
                <label className="form-label">Проект <span className="form-required">*</span></label>
                <select
                  className={`form-input${errors.project_id ? ' input-error' : ''}`}
                  value={form.project_id || projectIdFromUrl || ''}
                  onChange={upd('project_id')}
                  disabled={Boolean(projectIdFromUrl)}
                >
                  <option value="">— Выберите проект —</option>
                  {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
                <FieldError msg={errors.project_id} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Приоритет <span className="form-required">*</span></label>
                <select className="form-input" value={form.priority} onChange={upd('priority')}>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="urgent">Срочный</option>
                </select>
              </div>

              <div className="form-group" data-field="deadline">
                <label className="form-label">Дедлайн</label>
                <input
                  className={`form-input${errors.deadline ? ' input-error' : ''}`}
                  type="datetime-local"
                  value={form.deadline}
                  onChange={upd('deadline')}
                  min={!isEdit ? new Date(Date.now() + 60000).toISOString().slice(0, 16) : undefined}
                />
                <FieldError msg={errors.deadline} />
              </div>

              <div className="form-group">
                <label className="form-label">Исполнитель</label>
                <select className="form-input" value={form.assignee_id} onChange={upd('assignee_id')}>
                  <option value="">Не назначен</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="form-group" data-field="category">
                <label className="form-label">Категория</label>
                <input
                  className={`form-input${errors.category ? ' input-error' : ''}`}
                  type="text"
                  value={form.category}
                  onChange={upd('category')}
                  placeholder="Например: Backend"
                  maxLength={50}
                />
                <FieldError msg={errors.category} />
              </div>

              <div className="form-group" data-field="reward_points">
                <label className="form-label">Баллы за выполнение</label>
                <input
                  className={`form-input${errors.reward_points ? ' input-error' : ''}`}
                  type="number"
                  min="0"
                  max="100000"
                  value={form.reward_points}
                  onChange={upd('reward_points')}
                  placeholder="100"
                />
                <FieldError msg={errors.reward_points} />
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="form-group">
                <label className="form-label">Проект (необязательно)</label>
                <select className="form-input" value={form.project_id} onChange={upd('project_id')}>
                  <option value="">— Без проекта —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {/* Вложения */}
            <div className="form-group">
              <label className="form-label">
                <Paperclip size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Вложения
              </label>
              {pendingFiles.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {pendingFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 'var(--r)', marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>{getFileIcon(f.type)}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{f.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatSize(f.size)}</span>
                      <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }} onClick={() => removeFile(i)}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={12} />Прикрепить файл
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={onFilesSelected}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z"
              />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Макс. 10 МБ на файл</div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
