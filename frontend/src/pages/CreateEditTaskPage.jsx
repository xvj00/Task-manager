import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

export default function CreateEditTaskPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('project_id');
  const fileInputRef = useRef();

  const [users, setUsers] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]); // файлы ещё не загруженные
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', deadline: '', priority: 'medium',
    assignee_id: '', reward_points: 0, category: '',
    project_id: projectIdFromUrl || '',
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
    } else if (projectIdFromUrl) {
      api.get(`/projects/${projectIdFromUrl}`)
        .then(r => setUsers(r.data.members || []))
        .catch(() => {});
    }

    if (isEdit) {
      api.get(`/tasks/${id}`).then(r => {
        const t = r.data;
        setForm({
          title: t.title, description: t.description || '',
          deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 16) : '',
          priority: t.priority, assignee_id: t.assignee_id || '',
          reward_points: t.reward_points, category: t.category || '',
          project_id: t.project_id || projectIdFromUrl || '',
        });
      }).catch(() => navigate(-1));
    }
  }, [id, projectIdFromUrl, user]);

  const upd = f => e => setForm({ ...form, [f]: e.target.value });

  // Добавляем выбранные файлы в список (без дублей по имени+размеру)
  const onFilesSelected = (e) => {
    const selected = Array.from(e.target.files);
    setPendingFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...selected.filter(f => !existing.has(f.name + f.size))];
    });
    e.target.value = '';
  };

  const removeFile = (index) => setPendingFiles(prev => prev.filter((_, i) => i !== index));

  // Загружаем все pendingFiles на задачу с данным taskId
  const uploadFiles = async (taskId) => {
    for (const file of pendingFiles) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        await api.post(`/tasks/${taskId}/attachments`, fd);
      } catch {
        toast.error(`Не удалось загрузить: ${file.name}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.assignee_id) delete payload.assignee_id;
    if (!payload.deadline)    delete payload.deadline;
    if (!payload.project_id)  delete payload.project_id;

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
        if (payload.project_id) {
          navigate(`/projects/${payload.project_id}`);
        } else {
          navigate(`/tasks/${newId}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    } finally {
      setUploading(false);
    }
  };

  const backUrl = projectIdFromUrl ? `/projects/${projectIdFromUrl}` : (isEdit ? `/tasks/${id}` : '/tasks');

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <h1>{isEdit ? 'Редактировать задачу' : 'Новая задача'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label>Название *</label>
          <input type="text" value={form.title} onChange={upd('title')} required maxLength={150} placeholder="Что нужно сделать?" />
        </div>
        <div className="form-group">
          <label>Описание</label>
          <textarea value={form.description} onChange={upd('description')} rows={4} placeholder="Подробное описание задачи..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Приоритет</label>
            <select value={form.priority} onChange={upd('priority')}>
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
              <option value="urgent">🚨 Срочный</option>
            </select>
          </div>
          <div className="form-group">
            <label>Дедлайн</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={upd('deadline')}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Исполнитель</label>
            <select value={form.assignee_id} onChange={upd('assignee_id')}>
              <option value="">Открытая задача</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Категория / Тег</label>
            <input type="text" value={form.category} onChange={upd('category')} placeholder="Например: Дом, Работа" />
          </div>
        </div>
        <div className="form-group reward-input-group">
          <label>💰 Награда (баллов)</label>
          <input type="number" min="0" value={form.reward_points} onChange={upd('reward_points')} placeholder="0" />
          <span className="reward-hint">Баллы начислятся только после подтверждения</span>
        </div>

        {/* Вложения */}
        <div className="form-group">
          <label>📎 Вложения</label>
          <div className="task-form-attachments">
            {pendingFiles.length > 0 && (
              <div className="task-form-file-list">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="task-form-file-row">
                    <span className="task-form-file-icon">{getFileIcon(f.type)}</span>
                    <span className="task-form-file-name">{f.name}</span>
                    <span className="task-form-file-size">{formatSize(f.size)}</span>
                    <button type="button" className="task-form-file-remove" onClick={() => removeFile(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label className="task-form-upload-btn">
              + Добавить файл
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={onFilesSelected}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z"
              />
            </label>
            <span className="reward-hint">Макс. 10 МБ на файл. jpg, png, pdf, doc, xls, zip и др.</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(backUrl)} disabled={uploading}>Отмена</button>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading
              ? (pendingFiles.length > 0 ? `Загрузка файлов...` : 'Сохранение...')
              : (isEdit ? 'Сохранить' : 'Создать задачу')
            }
          </button>
        </div>
      </form>
    </div>
  );
}
