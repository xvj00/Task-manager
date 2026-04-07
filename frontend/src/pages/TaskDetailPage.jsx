import { useEffect, useRef, useState } from 'react';
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
const PRIORITY_META = { low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: '🚨 Срочный' };

export default function TaskDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [task, setTask]           = useState(null);
  const [project, setProject]     = useState(null);
  const [approvePoints, setApprovePoints] = useState('');
  const [rejectReason, setRejectReason]   = useState('');
  const [showReject, setShowReject]       = useState(false);
  const [newSubtask, setNewSubtask]       = useState('');
  const [newComment, setNewComment]       = useState('');
  const fileRef = useRef();

  const load = async () => {
    const r = await api.get(`/tasks/${id}`);
    setTask(r.data);
    setApprovePoints(r.data.reward_points);
    // Загружаем проект чтобы знать роль текущего пользователя
    if (r.data.project_id) {
      api.get(`/projects/${r.data.project_id}`)
        .then(pr => setProject(pr.data))
        .catch(() => {});
    }
  };
  useEffect(() => { load(); }, [id]);

  const handleTake    = async () => { try { await api.post(`/tasks/${id}/take`);   toast.success('Взяли в работу!');        load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const handleSubmit  = async () => { try { await api.post(`/tasks/${id}/submit`); toast.success('Отправлено на проверку!'); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const handleApprove = async () => { try { await api.post(`/tasks/${id}/approve`, { reward_points: Number(approvePoints) }); toast.success('Задача подтверждена!'); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const handleReject  = async () => { try { await api.post(`/tasks/${id}/reject`, { reason: rejectReason }); toast.success('Задача отклонена.'); setShowReject(false); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const handleArchive = async () => { try { await api.post(`/tasks/${id}/archive`); navigate('/tasks'); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const handleDelete  = async () => { if (!confirm('Удалить задачу?')) return; try { await api.delete(`/tasks/${id}`); navigate('/tasks'); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };

  // Подзадачи
  const addSubtask    = async (e) => { e.preventDefault(); if (!newSubtask.trim()) return; try { await api.post(`/tasks/${id}/subtasks`, { title: newSubtask }); setNewSubtask(''); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const toggleSubtask = async (s)  => { try { await api.put(`/tasks/${id}/subtasks/${s.id}`, { is_done: !s.is_done }); load(); } catch (e) { toast.error('Ошибка'); } };
  const deleteSubtask = async (sid) => { try { await api.delete(`/tasks/${id}/subtasks/${sid}`); load(); } catch (e) { toast.error('Ошибка'); } };

  // Комментарии
  const addComment    = async (e)   => { e.preventDefault(); if (!newComment.trim()) return; try { await api.post(`/tasks/${id}/comments`, { content: newComment }); setNewComment(''); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const deleteComment = async (cid) => { try { await api.delete(`/tasks/${id}/comments/${cid}`); load(); } catch (e) { toast.error('Ошибка'); } };

  // Вложения
  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try { await api.post(`/tasks/${id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Файл загружен'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка загрузки'); }
    fileRef.current.value = '';
  };
  const deleteAttachment = async (aid) => { try { await api.delete(`/tasks/${id}/attachments/${aid}`); load(); } catch (e) { toast.error('Ошибка'); } };

  if (!task) return <div className="loading">Загрузка...</div>;

  const meta       = STATUS_META[task.status] || {};
  const isAssignee = task.assignee_id === user?.id;
  const doneCount  = task.subtasks?.filter(s => s.is_done).length ?? 0;
  const totalCount = task.subtasks?.length ?? 0;

  // canManage: может создавать задачи, подтверждать, отклонять, архивировать
  // — глобальный admin всегда
  // — owner или editor проекта (если задача привязана к проекту)
  // — создатель задачи (для задач без проекта)
  const myProjectRole = project?.members?.find(m => m.id === user?.id)?.pivot?.role;
  const isProjectManager = project
    ? (project.owner_id === user?.id || myProjectRole === 'owner' || myProjectRole === 'editor')
    : false;
  const canManage = user?.role === 'admin' || isProjectManager || task.creator_id === user?.id;

  return (
    <div className="page page-narrow-lg">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(task.project_id ? `/projects/${task.project_id}` : '/tasks')}>← Назад</button>
        {canManage && (
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
          <div className="meta-item reward-meta"><div className="meta-label">Награда</div><div className="meta-value reward-value">💰 {task.reward_points} баллов</div></div>
          <div className="meta-item"><div className="meta-label">Создал</div><div className="meta-value">{task.creator?.name}</div></div>
        </div>

        {task.description && (
          <div className="task-description-block">
            <div className="block-label">Описание</div>
            <div className="task-description-text">{task.description}</div>
          </div>
        )}

        {task.rejection_reason && (
          <div className="rejection-block"><strong>❌ Причина отклонения:</strong> {task.rejection_reason}</div>
        )}

        {/* Подзадачи */}
        <div className="subtasks-block">
          <div className="block-label-row">
            <span className="block-label">Подзадачи</span>
            {totalCount > 0 && <span className="subtasks-progress">{doneCount}/{totalCount}</span>}
          </div>
          {totalCount > 0 && (
            <div className="subtasks-bar">
              <div className="subtasks-bar-fill" style={{ width: `${(doneCount / totalCount) * 100}%` }} />
            </div>
          )}
          <div className="subtasks-list">
            {task.subtasks?.map(s => (
              <div key={s.id} className={`subtask-row ${s.is_done ? 'done' : ''}`}>
                <input type="checkbox" checked={s.is_done} onChange={() => toggleSubtask(s)} />
                <span className="subtask-title">{s.title}</span>
                <button className="subtask-del" onClick={() => deleteSubtask(s.id)}>×</button>
              </div>
            ))}
          </div>
          <form onSubmit={addSubtask} className="subtask-add-form">
            <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Добавить подзадачу..." />
            <button type="submit" className="btn btn-secondary btn-sm">+</button>
          </form>
        </div>

        {/* Действия исполнителя — видны всем кроме менеджеров проекта (если только они не сами исполнитель) */}
        {(!canManage || isAssignee) && (
          <div className="task-actions">
            {task.status === 'open' && !isAssignee && !canManage && (
              <button className="btn btn-primary" onClick={handleTake}>🔄 Взять в работу</button>
            )}
            {task.status === 'in_progress' && isAssignee && (
              <button className="btn btn-success" onClick={handleSubmit}>✅ Отметить выполненной</button>
            )}
          </div>
        )}

        {/* Подтверждение / отклонение */}
        {canManage && task.status === 'review' && (
          <div className="review-panel">
            <h3>Задача на проверке</h3>
            <div className="review-points">
              <label>Баллы:</label>
              <input type="number" min="0" value={approvePoints} onChange={e => setApprovePoints(e.target.value)} />
              <span className="review-hint">Можно изменить перед подтверждением</span>
            </div>
            <div className="review-actions">
              <button className="btn btn-success" onClick={handleApprove}>🏆 Подтвердить</button>
              <button className="btn btn-danger" onClick={() => setShowReject(!showReject)}>❌ Отклонить</button>
            </div>
            {showReject && (
              <div className="reject-form">
                <textarea placeholder="Причина..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} />
                <button className="btn btn-danger btn-sm" onClick={handleReject}>Подтвердить отклонение</button>
              </div>
            )}
          </div>
        )}

        {/* Вложения */}
        <div className="attachments-block">
          <div className="block-label">Вложения ({task.attachments?.length ?? 0})</div>
          <div className="attachments-list">
            {task.attachments?.map(a => (
              <div key={a.id} className="attachment-row">
                <span className="attachment-icon">{getFileIcon(a.mime_type)}</span>
                <a href={`http://127.0.0.1:8001/storage/attachments/${a.filename}`} target="_blank" rel="noopener noreferrer" className="attachment-name">{a.original_name}</a>
                <span className="attachment-size">{formatSize(a.size)}</span>
                <button className="btn btn-danger btn-xs" onClick={() => deleteAttachment(a.id)}>×</button>
              </div>
            ))}
          </div>
          <label className="btn btn-secondary btn-sm upload-btn" style={{ cursor: 'pointer', display: 'inline-flex' }}>
            📎 Прикрепить файл
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={uploadFile} />
          </label>
        </div>

        {/* Комментарии */}
        <div className="comments-block">
          <div className="block-label">Комментарии ({task.comments?.length ?? 0})</div>
          <div className="comments-list">
            {task.comments?.length === 0 && <p className="empty-state">Комментариев пока нет</p>}
            {task.comments?.map(c => (
              <div key={c.id} className="comment-row">
                <div className="comment-avatar">{c.user?.name?.[0]?.toUpperCase()}</div>
                <div className="comment-body">
                  <div className="comment-header">
                    <span className="comment-author">{c.user?.name}</span>
                    <span className="comment-date">{new Date(c.created_at).toLocaleString('ru-RU')}</span>
                    {(c.user_id === user?.id || canManage) && (
                      <button className="comment-del" onClick={() => deleteComment(c.id)}>×</button>
                    )}
                  </div>
                  <div className="comment-text">{c.content}</div>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={addComment} className="comment-add-form">
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Написать комментарий..." rows={2} />
            <button type="submit" className="btn btn-primary btn-sm">Отправить</button>
          </form>
        </div>

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
