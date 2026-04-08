import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
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
  const [subtasks, setSubtasks]           = useState([]);
  const [previewFiles, setPreviewFiles]   = useState([]); // [] | [f] | [f, f]
  const [panelWidth, setPanelWidth]       = useState(420);
  const [splitRatio, setSplitRatio]       = useState(0.5); // доля верхней панели
  const [isResizing, setIsResizing]       = useState(false);
  const [isSplitResizing, setIsSplitResizing] = useState(false);
  const dragIndexRef      = useRef(null);
  const isResizingRef     = useRef(false);
  const isSplitResizingRef = useRef(false);
  const fileRef = useRef();

  const load = async () => {
    const r = await api.get(`/tasks/${id}`);
    setTask(r.data);
    setSubtasks(r.data.subtasks || []);
    setApprovePoints(r.data.reward_points);
    if (r.data.project_id) {
      api.get(`/projects/${r.data.project_id}`)
        .then(pr => setProject(pr.data))
        .catch(() => {});
    }
  };
  useEffect(() => { load(); }, [id]);

  // Resize панели: тащим левый край
  const startResize = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => {
      if (!isResizingRef.current) return;
      const newW = window.innerWidth - ev.clientX;
      setPanelWidth(Math.min(Math.max(newW, 280), window.innerWidth - 340));
    };
    const onUp = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startSplitResize = (e) => {
    e.preventDefault();
    isSplitResizingRef.current = true;
    setIsSplitResizing(true);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => {
      if (!isSplitResizingRef.current) return;
      const ratio = ev.clientY / window.innerHeight;
      setSplitRatio(Math.min(Math.max(ratio, 0.15), 0.85));
    };
    const onUp = () => {
      isSplitResizingRef.current = false;
      setIsSplitResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const fileUrl    = (a) => `http://127.0.0.1:8001/storage/attachments/${a.filename}`;
  const fileApiUrl = (a) => `http://127.0.0.1:8001/api/files/${a.filename}`;

  const openFile = (file, e) => {
    if (e.ctrlKey && previewFiles.length === 1 && previewFiles[0].id !== file.id) {
      // Shift+клик — добавляем второй файл
      setPreviewFiles([previewFiles[0], file]);
    } else if (previewFiles.find(f => f.id === file.id)) {
      // Клик на уже открытый — закрываем
      setPreviewFiles(prev => prev.filter(f => f.id !== file.id));
    } else {
      // Обычный клик — заменяем всё
      setPreviewFiles([file]);
    }
  };

  const closeFile = (fileId) => setPreviewFiles(prev => prev.filter(f => f.id !== fileId));

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

  // Drag-and-drop порядок подзадач
  const onDragStart = (index) => { dragIndexRef.current = index; };
  const onDragOver  = (e, index) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    const reordered = [...subtasks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(index, 0, moved);
    dragIndexRef.current = index;
    setSubtasks(reordered);
  };
  const onDragEnd = async () => {
    dragIndexRef.current = null;
    try {
      await api.post(`/tasks/${id}/subtasks/reorder`, { ids: subtasks.map(s => s.id) });
    } catch { toast.error('Не удалось сохранить порядок'); load(); }
  };

  // Комментарии
  const addComment    = async (e)   => { e.preventDefault(); if (!newComment.trim()) return; try { await api.post(`/tasks/${id}/comments`, { content: newComment }); setNewComment(''); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const deleteComment = async (cid) => { try { await api.delete(`/tasks/${id}/comments/${cid}`); load(); } catch (e) { toast.error('Ошибка'); } };

  // Вложения
  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try { await api.post(`/tasks/${id}/attachments`, fd); toast.success('Файл загружен'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка загрузки'); }
    fileRef.current.value = '';
  };
  const deleteAttachment = async (aid) => { try { await api.delete(`/tasks/${id}/attachments/${aid}`); load(); } catch (e) { toast.error('Ошибка'); } };

  if (!task) return <div className="loading">Загрузка...</div>;

  const meta       = STATUS_META[task.status] || {};
  const isAssignee = task.assignee_id === user?.id;
  const doneCount  = subtasks.filter(s => s.is_done).length;
  const totalCount = subtasks.length;

  const myProjectRole = project?.members?.find(m => m.id === user?.id)?.pivot?.role;
  const isProjectManager = project
    ? (project.owner_id === user?.id || myProjectRole === 'owner' || myProjectRole === 'editor')
    : false;
  const canManage = user?.role === 'admin' || isProjectManager || task.creator_id === user?.id;

  // Задача занята — посторонний пользователь может только смотреть
  const isLocked = !isAssignee && !canManage && task.status !== 'open';

  return (
    <div className={`task-detail-layout ${previewFiles.length > 0 ? 'with-preview' : ''}`}>
    <div className="page page-narrow-lg" style={previewFiles.length > 0 ? { marginRight: panelWidth + 8 } : {}}>
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

      {/* Баннер блокировки */}
      {isLocked && (
        <div className="task-locked-banner">
          <span className="task-locked-icon">🔒</span>
          <div>
            <div className="task-locked-title">Задача уже в работе</div>
            <div className="task-locked-sub">Исполнитель: <strong>{task.assignee?.name}</strong> — вы можете смотреть, но не редактировать</div>
          </div>
        </div>
      )}

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
          <div className={`subtasks-list ${isLocked ? 'locked-section' : ''}`}>
            {subtasks.map((s, index) => (
              <div
                key={s.id}
                className={`subtask-row ${s.is_done ? 'done' : ''}`}
                draggable={!isLocked}
                onDragStart={!isLocked ? () => onDragStart(index) : undefined}
                onDragOver={!isLocked ? (e) => onDragOver(e, index) : undefined}
                onDrop={!isLocked ? onDragEnd : undefined}
              >
                {!isLocked && <span className="subtask-drag-handle" title="Перетащить">⠿</span>}
                <input type="checkbox" checked={s.is_done} disabled={isLocked} onChange={() => !isLocked && toggleSubtask(s)} />
                <span className="subtask-title">{s.title}</span>
                {!isLocked && <button className="subtask-del" onClick={() => deleteSubtask(s.id)}>×</button>}
              </div>
            ))}
          </div>
          {!isLocked && (
            <form onSubmit={addSubtask} className="subtask-add-form">
              <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Добавить подзадачу..." />
              <button type="submit" className="btn btn-secondary btn-sm">+</button>
            </form>
          )}
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
          <div className="block-label">
            Вложения ({task.attachments?.length ?? 0})
            {isLocked && <span className="locked-hint">👁 только просмотр</span>}
          </div>
          <div className="attachments-list">
            {task.attachments?.map(a => (
              <div
                key={a.id}
                className={`attachment-row ${previewFiles.find(f => f.id === a.id) ? 'active' : ''}`}
                onClick={(e) => openFile(a, e)}
              >
                <span className="attachment-icon">{getFileIcon(a.mime_type)}</span>
                <span className="attachment-name">{a.original_name}</span>
                <span className="attachment-size">{formatSize(a.size)}</span>
                {!isLocked && (
                  <button className="btn btn-danger btn-xs" onClick={(e) => { e.stopPropagation(); deleteAttachment(a.id); }}>×</button>
                )}
              </div>
            ))}
          </div>
          {!isLocked && (
            <label className="btn btn-secondary btn-sm upload-btn" style={{ cursor: 'pointer', display: 'inline-flex' }}>
              📎 Прикрепить файл
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={uploadFile} />
            </label>
          )}
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
                    {!isLocked && (c.user_id === user?.id || canManage) && (
                      <button className="comment-del" onClick={() => deleteComment(c.id)}>×</button>
                    )}
                  </div>
                  <div className="comment-text">{c.content}</div>
                </div>
              </div>
            ))}
          </div>
          {isLocked ? (
            <div className="comment-locked-placeholder">
              🔒 Оставлять комментарии может только исполнитель задачи
            </div>
          ) : (
            <form onSubmit={addComment} className="comment-add-form">
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Написать комментарий..." rows={2} />
              <button type="submit" className="btn btn-primary btn-sm">Отправить</button>
            </form>
          )}
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

    {/* Панель предпросмотра файлов справа */}
    {previewFiles.length > 0 && (
      <div className="file-preview-panel" style={{ width: panelWidth }}>
        <div className="file-preview-resize-handle" onMouseDown={startResize} />

        <FilePreviewPane
          key={previewFiles[0].id}
          file={previewFiles[0]}
          fileUrl={fileUrl}
          fileApiUrl={fileApiUrl}
          isResizing={isResizing || isSplitResizing}
          paneStyle={previewFiles.length === 2
            ? { height: `${splitRatio * 100}%`, flex: 'none' }
            : { flex: 1 }}
          onClose={() => closeFile(previewFiles[0].id)}
          onAutoResize={(w) => {
            if (previewFiles.length === 1)
              setPanelWidth(Math.min(Math.max(w, 400), window.innerWidth - 340));
          }}
        />

        {previewFiles.length === 2 && (
          <>
            {/* Вертикальный разделитель */}
            <div className="file-preview-vsplit-handle" onMouseDown={startSplitResize} />

            <FilePreviewPane
              key={previewFiles[1].id}
              file={previewFiles[1]}
              fileUrl={fileUrl}
              fileApiUrl={fileApiUrl}
              isResizing={isResizing || isSplitResizing}
              paneStyle={{ height: `${(1 - splitRatio) * 100}%`, flex: 'none' }}
              onClose={() => closeFile(previewFiles[1].id)}
              onAutoResize={() => {}}
            />
          </>
        )}
      </div>
    )}
    </div>
  );
}

/* ── Независимая панель одного файла ── */
function FilePreviewPane({ file, fileUrl, fileApiUrl, isResizing, paneStyle, onClose, onAutoResize }) {
  const [zoom, setZoom]                   = useState(1);
  const [imgFullscreen, setImgFullscreen] = useState(false);
  const docxRef = useRef(null);

  const isImage = (m) => m?.startsWith('image/');
  const isPdf   = (m) => m === 'application/pdf';
  const isDocx  = (m) => m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || m === 'application/msword';

  const zoomIn    = () => setZoom(z => Math.min(+(z + 0.25).toFixed(2), 3));
  const zoomOut   = () => setZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.25));
  const zoomReset = () => setZoom(1);

  // Рендер DOCX
  useEffect(() => {
    if (!isDocx(file.mime_type) || !docxRef.current) return;
    docxRef.current.innerHTML = '<div style="padding:24px;color:#888">Загрузка документа...</div>';
    fetch(fileApiUrl(file))
      .then(r => r.blob())
      .then(async blob => {
        await renderAsync(blob, docxRef.current, null, {
          className: 'docx-render',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        });
        requestAnimationFrame(() => {
          const page = docxRef.current?.querySelector('.docx-wrapper > section, .docx');
          const contentW = page ? page.scrollWidth : docxRef.current?.scrollWidth;
          if (contentW) onAutoResize?.(contentW + 48);
        });
      })
      .catch(() => {});
  }, [file.id]);

  // ESC закрывает полный экран
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setImgFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <>
      <div className="file-preview-pane" style={paneStyle}>
        {/* Заголовок панели */}
        <div className="file-preview-header">
          <span className="file-preview-title" title={file.original_name}>
            {getFileIcon(file.mime_type)} {file.original_name}
          </span>
          <div className="file-preview-actions">
            {(isImage(file.mime_type) || isPdf(file.mime_type)) && (
              <div className="file-preview-zoom">
                <button className="zoom-btn" onClick={zoomOut}>−</button>
                <span className="zoom-value" onClick={zoomReset}>{Math.round(zoom * 100)}%</span>
                <button className="zoom-btn" onClick={zoomIn}>+</button>
              </div>
            )}
            {isImage(file.mime_type) && (
              <button className="btn btn-secondary btn-sm" onClick={() => setImgFullscreen(true)} title="Полный экран">⛶</button>
            )}
            <a href={fileUrl(file)} download={file.original_name} className="btn btn-secondary btn-sm">⬇</a>
            <button className="file-preview-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Тело */}
        <div className="file-preview-body">
          {isImage(file.mime_type) ? (
            <div className="file-preview-zoom-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <img src={fileUrl(file)} alt={file.original_name} className="file-preview-img" />
            </div>
          ) : isPdf(file.mime_type) ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              {isResizing && <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'ew-resize' }} />}
              <iframe
                src={`${fileUrl(file)}#zoom=${Math.round(zoom * 100)}&toolbar=1&navpanes=1`}
                title={file.original_name}
                className="file-preview-iframe"
              />
            </div>
          ) : isDocx(file.mime_type) ? (
            <div ref={docxRef} className="file-preview-docx" />
          ) : (
            <div className="file-preview-fallback">
              <div className="file-preview-big-icon">{getFileIcon(file.mime_type)}</div>
              <div className="file-preview-fallback-name">{file.original_name}</div>
              <div className="file-preview-fallback-size">{formatSize(file.size)}</div>
              <a href={fileUrl(file)} download={file.original_name} className="btn btn-primary">⬇ Скачать файл</a>
            </div>
          )}
        </div>
      </div>

      {/* Полноэкранный просмотр */}
      {imgFullscreen && (
        <div className="img-fullscreen-overlay" onClick={() => setImgFullscreen(false)}>
          <button className="img-fullscreen-close" onClick={() => setImgFullscreen(false)}>×</button>
          <img src={fileUrl(file)} alt={file.original_name} className="img-fullscreen-img" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
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
