import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function CreateEditTaskPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('project_id');

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', deadline: '', priority: 'medium',
    assignee_id: '', reward_points: 0, category: '',
    project_id: projectIdFromUrl || '',
  });

  useEffect(() => {
    // Загружаем список пользователей для назначения
    if (user?.role === 'admin') {
      // Администратор видит всех
      api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
    } else if (projectIdFromUrl) {
      // Владелец/редактор проекта видит участников проекта
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.assignee_id) delete payload.assignee_id;
    if (!payload.deadline)    delete payload.deadline;
    if (!payload.project_id)  delete payload.project_id;
    try {
      if (isEdit) {
        await api.put(`/tasks/${id}`, payload);
        toast.success('Задача обновлена');
        navigate(`/tasks/${id}`);
      } else {
        const r = await api.post('/tasks', payload);
        toast.success('Задача создана');
        // Возвращаемся в проект, если создавали из проекта
        if (payload.project_id) {
          navigate(`/projects/${payload.project_id}`);
        } else {
          navigate(`/tasks/${r.data.id}`);
        }
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
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
            <input type="datetime-local" value={form.deadline} onChange={upd('deadline')} />
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
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(backUrl)}>Отмена</button>
          <button type="submit" className="btn btn-primary">{isEdit ? 'Сохранить' : 'Создать задачу'}</button>
        </div>
      </form>
    </div>
  );
}
