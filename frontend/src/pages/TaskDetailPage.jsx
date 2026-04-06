import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const STATUS_META = {
  open:        { label: '📋 Открыта',     cls: 'open'        },
  in_progress: { label: '🔄 В процессе', cls: 'in_progress' },
  review:      { label: '✅ На проверке', cls: 'review'      },
  done:        { label: '🏆 Выполнена',  cls: 'done'        },
  rejected:    { label: '❌ Отклонена',  cls: 'rejected'    },
  archive:     { label: '🗄 Архив',      cls: 'archive'     },
};
const PRIORITY_META = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: '🚨 Срочный',
};

export default function TaskDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [approvePoints, setApprovePoints] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const load = () => api.get(`/tasks/${id}`).then(r => { setTask(r.data); setApprovePoints(r.data.reward_points); });

  useEffect(() => { load(); }, [id]);

  const handleTake = async () => {
    try { await api.post(`/tasks/${id}/take`); toast.success('Взяли в работу!'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const handleSubmit = async () => {
    try { await api.post(`/tasks/${id}/submit`); toast.success('Отправлено на проверку!'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const handleApprove = async () => {
    try { await api.post(`/tasks/${id}/approve`, { reward_points: Number(approvePoints) }); toast.success('Задача подтверждена! Баллы начислены.'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const handleReject = async () => {
    try { await api.post(`/tasks/${id}/reject`, { reason: rejectReason }); toast.success('Задача отклонена.'); setShowReject(false); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const handleArchive = async () => {
    try { await api.post(`/tasks/${id}/archive`); toast.success('Архивировано.'); navigate('/tasks'); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const handleDelete = async () => {
    if (!confirm('Удалить задачу?')) return;
    try { await api.delete(`/tasks/${id}`); toast.success('Удалено.'); navigate('/tasks'); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  if (!task) return <div className="loading">Загрузка...</div>;

  const meta = STATUS_META[task.status] || {};
  const isCreator = user?.role === 'creator';
  const isAssignee = task.assignee_id === user?.id;

  return (
    <div className="page page-narrow-lg">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/tasks')}>← Назад</button>
        {isCreator && (
          <div className="page-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/tasks/${id}/edit`)}>Редактировать</button>
            <button className="btn btn-secondary btn-sm" onClick={handleArchive}>🗄 Архив</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Удалить</button>
          </div>
        )}
      </div>

      <div className="task-detail-card">
        <div className="task-detail-header">
          <span className={`status-badge large ${meta.cls}`}>{meta.label}</span>
          <h1 className="task-detail-title">{task.title}</h1>
        </div>

        <div className="task-meta-grid">
          <div className="meta-item"><div className="meta-label">Приоритет</div><div className="meta-value">{PRIORITY_META[task.priority]}</div></div>
          <div className="meta-item"><div className="meta-label">Исполнитель</div><div className="meta-value">{task.assignee?.name || 'Не назначен'}</div></div>
          <div className="meta-item"><div className="meta-label">Дедлайн</div><div className="meta-value">{task.deadline ? new Date(task.deadline).toLocaleString('ru-RU') : 'Не задан'}</div></div>
          <div className="meta-item"><div className="meta-label">Категория</div><div className="meta-value">{task.category || '—'}</div></div>
          <div className="meta-item reward-meta">
            <div className="meta-label">Награда</div>
            <div className="meta-value reward-value">💰 {task.reward_points} баллов</div>
          </div>
          <div className="meta-item"><div className="meta-label">Создал</div><div className="meta-value">{task.creator?.name}</div></div>
        </div>

        {task.description && (
          <div className="task-description-block">
            <div className="block-label">Описание</div>
            <div className="task-description-text">{task.description}</div>
          </div>
        )}

        {task.rejection_reason && (
          <div className="rejection-block">
            <strong>❌ Причина отклонения:</strong> {task.rejection_reason}
          </div>
        )}

        {/* Действия исполнителя */}
        {!isCreator && (
          <div className="task-actions">
            {task.status === 'open' && (
              <button className="btn btn-primary" onClick={handleTake}>🔄 Взять в работу</button>
            )}
            {task.status === 'in_progress' && isAssignee && (
              <button className="btn btn-success" onClick={handleSubmit}>✅ Отметить выполненной</button>
            )}
          </div>
        )}

        {/* Подтверждение / отклонение (создатель) */}
        {isCreator && task.status === 'review' && (
          <div className="review-panel">
            <h3>Задача на проверке</h3>
            <div className="review-points">
              <label>Баллы за выполнение:</label>
              <input type="number" min="0" value={approvePoints} onChange={e => setApprovePoints(e.target.value)} />
              <span className="review-hint">Можно изменить перед подтверждением</span>
            </div>
            <div className="review-actions">
              <button className="btn btn-success" onClick={handleApprove}>🏆 Подтвердить и начислить</button>
              <button className="btn btn-danger" onClick={() => setShowReject(!showReject)}>❌ Отклонить</button>
            </div>
            {showReject && (
              <div className="reject-form">
                <textarea placeholder="Причина отклонения (необязательно)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} />
                <button className="btn btn-danger btn-sm" onClick={handleReject}>Подтвердить отклонение</button>
              </div>
            )}
          </div>
        )}

        {/* История */}
        {task.logs?.length > 0 && (
          <div className="task-history">
            <h3>История изменений</h3>
            <div className="history-list">
              {task.logs.map(log => (
                <div key={log.id} className="history-item">
                  <div className="history-dot" />
                  <div className="history-body">
                    <span className="history-user">{log.user?.name}</span>
                    <span className="history-comment">{log.comment}</span>
                    <span className="history-date">{new Date(log.created_at).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
