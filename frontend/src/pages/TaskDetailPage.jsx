import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import {
  ArrowLeft, Pencil, Archive, Trash2, ShieldCheck, Check, X,
  ListChecks, Plus, MessageCircle, Send, History, Paperclip,
  FileText, Image, AlertCircle, Calendar, Coins, Tag, User,
  Download, ZoomIn, ZoomOut, Maximize2, Minimize2,
} from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const STATUS_CLS   = { open:'badge-open', in_progress:'badge-progress', review:'badge-review', done:'badge-done', rejected:'badge-rejected', archive:'badge-archive' };
const STATUS_LABEL = { open:'Открыта', in_progress:'В процессе', review:'На проверке', done:'Выполнена', rejected:'Отклонена', archive:'Архив' };
const PRIORITY_CLS   = { low:'badge-low', medium:'badge-medium', high:'badge-high', urgent:'badge-urgent' };
const PRIORITY_LABEL = { low:'Низкий', medium:'Средний', high:'Высокий', urgent:'Срочный' };

const isImage = (m) => !!m?.startsWith('image/');
const isPdf   = (m) => m === 'application/pdf';
const isDocx  = (m) => m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || m === 'application/msword';

function getFileIcon(mime, size = 14) {
  if (!mime) return <FileText size={size} color="var(--text3)" />;
  if (mime.startsWith('image/'))  return <Image   size={size} color="#3b82f6" />;
  if (mime === 'application/pdf') return <FileText size={size} color="#e11d48" />;
  if (mime.includes('word'))      return <FileText size={size} color="#2563eb" />;
  return <FileText size={size} color="var(--text3)" />;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / 1024 / 1024).toFixed(1) + ' МБ';
}

/* ── One file preview pane (logic from reference project) ── */
function FilePreviewPane({ file, fileUrl, fileApiUrl, isResizing, paneStyle, onClose, onDownload, onAutoResize, initialZoom = 1 }) {
  const [zoom, setZoom]                   = useState(initialZoom);
  const [imgFullscreen, setImgFullscreen] = useState(false);
  const docxRef = useRef(null);

  // initialZoom arrives after img.onload (async) — sync zoom when it updates
  useEffect(() => { setZoom(initialZoom); }, [initialZoom]);

  // Render DOCX and auto-resize panel width to fit content
  useEffect(() => {
    if (!isDocx(file.mime_type) || !docxRef.current) return;
    docxRef.current.innerHTML = '<div style="padding:24px;color:#888">Загрузка документа...</div>';
    fetch(fileApiUrl(file))
      .then(r => r.blob())
      .then(async blob => {
        await renderAsync(blob, docxRef.current, null, {
          className: 'docx-render', inWrapper: true, breakPages: true, useBase64URL: true,
        });
        requestAnimationFrame(() => {
          const page = docxRef.current?.querySelector('.docx-wrapper > section, .docx');
          const w = page ? page.scrollWidth : docxRef.current?.scrollWidth;
          if (w) onAutoResize?.(w + 48);
        });
      })
      .catch(() => {});
  }, [file.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC closes image fullscreen
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setImgFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const showZoom = isImage(file.mime_type) || isPdf(file.mime_type);

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', minHeight: 0, ...paneStyle }}>
        {/* Pane header */}
        <div style={{
          padding:'7px 12px', flexShrink:0,
          borderBottom:'0.5px solid var(--border)',
          display:'flex', alignItems:'center', gap:8,
          background:'var(--surface2)',
        }}>
          {getFileIcon(file.mime_type, 14)}
          <span style={{ flex:1, fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text1)' }}>
            {file.original_name}
          </span>

          {/* Zoom controls */}
          {showZoom && (
            <div style={{ display:'flex', alignItems:'center', gap:2, flexShrink:0 }}>
              <button className="btn btn-ghost" style={{ padding:'2px 5px' }} onClick={() => setZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.25))}>
                <ZoomOut size={11} />
              </button>
              <span
                style={{ fontSize:11, color:'var(--text2)', minWidth:32, textAlign:'center', cursor:'pointer' }}
                onClick={() => setZoom(1)}
              >{Math.round(zoom * 100)}%</span>
              <button className="btn btn-ghost" style={{ padding:'2px 5px' }} onClick={() => setZoom(z => Math.min(+(z + 0.25).toFixed(2), 3))}>
                <ZoomIn size={11} />
              </button>
            </div>
          )}

          {/* Fullscreen button — only for images (reference approach) */}
          {isImage(file.mime_type) && (
            <button
              className="btn btn-ghost"
              style={{ padding:'2px 6px', flexShrink:0 }}
              onClick={() => setImgFullscreen(true)}
              title="Полный экран"
            >
              <Maximize2 size={12} />
            </button>
          )}

          {/* Download */}
          <button
            className="btn btn-ghost"
            style={{ padding:'2px 6px', flexShrink:0 }}
            onClick={() => onDownload(file)}
            title="Скачать"
          >
            <Download size={12} />
          </button>

          {/* Close this pane */}
          <button
            className="btn btn-ghost"
            style={{ padding:'2px 6px', flexShrink:0 }}
            onClick={onClose}
            title="Закрыть"
          >
            <X size={12} />
          </button>
        </div>

        {/* Pane body */}
        <div style={{ flex:1, overflow:'auto', position:'relative', minHeight:0 }}>
          {isImage(file.mime_type) ? (
            <div style={{ padding:12, background:'#f8fafc', minHeight:'100%', display:'flex', justifyContent:'center', alignItems:'flex-start', overflow:'auto' }}>
              <img
                src={fileUrl(file)}
                alt={file.original_name}
                style={{
                  display:'block',
                  flexShrink:0,
                  transform:`scale(${zoom})`,
                  transformOrigin:'top center',
                  transition:'transform 0.15s',
                  borderRadius:'var(--r)',
                  boxShadow:'0 2px 12px rgba(0,0,0,0.08)',
                }}
              />
            </div>
          ) : isPdf(file.mime_type) ? (
            <div style={{ width:'100%', height:'100%', position:'relative' }}>
              {/* Overlay during resize prevents iframe from stealing mouse events */}
              {isResizing && <div style={{ position:'absolute', inset:0, zIndex:10 }} />}
              <iframe
                src={`${fileUrl(file)}#zoom=${Math.round(zoom * 100)}&toolbar=1&navpanes=0`}
                title={file.original_name}
                style={{ width:'100%', height:'100%', border:'none', display:'block' }}
              />
            </div>
          ) : isDocx(file.mime_type) ? (
            <div ref={docxRef} className="docx-render" style={{ minHeight:'100%' }} />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:32, color:'var(--text3)', minHeight:'100%' }}>
              <FileText size={52} />
              <div style={{ fontSize:13, textAlign:'center' }}>Предпросмотр недоступен</div>
              <button className="btn btn-primary" style={{ fontSize:12 }} onClick={() => onDownload(file)}>
                <Download size={13} />Скачать файл
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image fullscreen overlay (reference approach) */}
      {imgFullscreen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setImgFullscreen(false)}
        >
          <button
            className="btn btn-ghost"
            style={{ position:'absolute', top:16, right:16, color:'#fff', fontSize:14 }}
            onClick={() => setImgFullscreen(false)}
          >
            <X size={20} />
          </button>
          <img
            src={fileUrl(file)}
            alt={file.original_name}
            style={{ maxWidth:'95vw', maxHeight:'95vh', objectFit:'contain', borderRadius:'var(--r)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

/* ── Main page ── */
export default function TaskDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [task, setTask]                   = useState(null);
  const [project, setProject]             = useState(null);
  const [approvePoints, setApprovePoints] = useState('');
  const [rejectReason, setRejectReason]   = useState('');
  const [showReject, setShowReject]       = useState(false);
  const [newSubtask, setNewSubtask]       = useState('');
  const [newComment, setNewComment]       = useState('');
  const [subtasks, setSubtasks]           = useState([]);

  // Preview panel state
  const [previewFiles, setPreviewFiles]   = useState([]);   // max 2
  const [panelWidth, setPanelWidth]       = useState(440);
  const [splitRatio, setSplitRatio]       = useState(0.5);  // fraction for top pane
  const [panelFullscreen, setPanelFullscreen] = useState(false);
  const [isResizing, setIsResizing]           = useState(false);
  const [isSplitResizing, setIsSplitResizing] = useState(false);
  const [paneInitialZoom, setPaneInitialZoom] = useState({});

  const isResizingRef      = useRef(false);
  const isSplitResizingRef = useRef(false);
  const dragIndexRef       = useRef(null);
  const fileRef            = useRef();

  const load = async () => {
    const r = await api.get(`/tasks/${id}`);
    setTask(r.data);
    setSubtasks(r.data.subtasks || []);
    setApprovePoints(r.data.reward_points);
    if (r.data.project_id) {
      api.get(`/projects/${r.data.project_id}`).then(pr => setProject(pr.data)).catch(() => {});
    }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fileUrl    = (a) => `http://127.0.0.1:8001/storage/attachments/${a.filename}`;
  const fileApiUrl = (a) => `http://127.0.0.1:8001/api/files/${a.filename}`;

  const maxPanelW = () => window.innerWidth - 616; // sidebar(220) + gap(16) + minTask(380)

  // Auto-resize panel + zoom, then open the file (deferred for images so sizes are ready on mount)
  const autoResizeAndOpen = (file) => {
    const max = maxPanelW();
    if (isImage(file.mime_type)) {
      const img = new window.Image();
      img.onload = () => {
        const large    = img.naturalWidth > 1200 || img.naturalHeight > 800;
        const zoom     = large ? 0.25 : 1;
        const displayW = img.naturalWidth * zoom;
        const target   = Math.min(displayW + 40, max);
        // Set everything before mounting the pane — no async mismatch
        setPanelWidth(Math.max(360, target));
        setPaneInitialZoom(prev => ({ ...prev, [file.id]: zoom }));
        setPreviewFiles([file]);
      };
      img.src = fileUrl(file);
    } else {
      // PDF / DOCX — open immediately, no dimension pre-check needed
      if (isPdf(file.mime_type)) setPanelWidth(Math.min(860, max));
      setPreviewFiles([file]);
    }
    // DOCX width: handled by onAutoResize after docx-preview renders
  };

  // Click — replace. Ctrl+click — add second file (max 2, reference logic).
  const openFile = (file, e) => {
    if (e.ctrlKey && previewFiles.length === 1 && previewFiles[0].id !== file.id) {
      setPreviewFiles([previewFiles[0], file]);
      setSplitRatio(0.5);
    } else if (previewFiles.find(f => f.id === file.id)) {
      setPreviewFiles(prev => prev.filter(f => f.id !== file.id));
    } else {
      setPanelFullscreen(false);
      autoResizeAndOpen(file);
    }
  };

  const closeFile    = (fileId) => setPreviewFiles(prev => prev.filter(f => f.id !== fileId));
  const closeAllFiles = () => { setPreviewFiles([]); setPanelFullscreen(false); };

  // Horizontal resize — drag left edge of panel (reference: window.innerWidth - clientX)
  const startResize = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => {
      if (!isResizingRef.current) return;
      const w = window.innerWidth - ev.clientX;
      // sidebar(220) + gap(16) + min task visible(380) = 616
      setPanelWidth(Math.min(Math.max(w, 280), window.innerWidth - 616));
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

  // Vertical split — drag handle between two panes (reference: clientY / innerHeight)
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

  // Blob download — works cross-origin (our feature)
  const downloadFile = async (file) => {
    try {
      const res = await api.get(`/files/${file.filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = file.original_name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('Ошибка скачивания'); }
  };

  const handleTake    = async () => { try { await api.post(`/tasks/${id}/take`);   toast.success('Взяли в работу!');        load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const handleSubmit  = async () => { try { await api.post(`/tasks/${id}/submit`); toast.success('Отправлено на проверку!'); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const handleApprove = async () => {
    const pts = Number(approvePoints);
    if (!Number.isInteger(pts) || pts < 0) { toast.error('Укажите корректное количество баллов (≥ 0)'); return; }
    try { await api.post(`/tasks/${id}/approve`, { reward_points: pts }); toast.success('Задача подтверждена!'); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const handleReject  = async () => {
    if (!rejectReason.trim()) { toast.error('Укажите причину отклонения'); return; }
    try { await api.post(`/tasks/${id}/reject`, { reason: rejectReason.trim() }); toast.success('Задача отклонена.'); setShowReject(false); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const handleArchive = async () => { try { await api.post(`/tasks/${id}/archive`); navigate('/tasks'); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };
  const handleDelete  = async () => { if (!confirm('Удалить задачу?')) return; try { await api.delete(`/tasks/${id}`); navigate('/tasks'); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); } };

  const addSubtask    = async (e) => {
    e.preventDefault();
    const t = newSubtask.trim();
    if (!t) { toast.error('Введите название подзадачи'); return; }
    if (t.length > 200) { toast.error('Максимум 200 символов'); return; }
    try { await api.post(`/tasks/${id}/subtasks`, { title: t }); setNewSubtask(''); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const toggleSubtask = async (s)   => { try { await api.put(`/tasks/${id}/subtasks/${s.id}`, { is_done: !s.is_done }); load(); } catch { toast.error('Ошибка'); } };
  const deleteSubtask = async (sid) => { try { await api.delete(`/tasks/${id}/subtasks/${sid}`); load(); } catch { toast.error('Ошибка'); } };

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
    try { await api.post(`/tasks/${id}/subtasks/reorder`, { ids: subtasks.map(s => s.id) }); }
    catch { toast.error('Не удалось сохранить порядок'); load(); }
  };

  const addComment    = async (e) => {
    e.preventDefault();
    const c = newComment.trim();
    if (!c) { toast.error('Введите текст комментария'); return; }
    if (c.length > 2000) { toast.error('Максимум 2000 символов'); return; }
    try { await api.post(`/tasks/${id}/comments`, { content: c }); setNewComment(''); load(); } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const deleteComment = async (cid) => { try { await api.delete(`/tasks/${id}/comments/${cid}`); load(); } catch { toast.error('Ошибка'); } };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try { await api.post(`/tasks/${id}/attachments`, fd); toast.success('Файл загружен'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка загрузки'); }
    fileRef.current.value = '';
  };
  const deleteAttachment = async (aid) => {
    try { await api.delete(`/tasks/${id}/attachments/${aid}`); closeFile(aid); load(); }
    catch { toast.error('Ошибка'); }
  };

  // ESC — close panel fullscreen
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && panelFullscreen) setPanelFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [panelFullscreen]);

  if (!task) return <div style={{ color:'var(--text3)', padding:24 }}>Загрузка...</div>;

  const isAssignee = task.assignee_id === user?.id;
  const myProjectRole = project?.members?.find(m => m.id === user?.id)?.pivot?.role;
  const isProjectManager = project ? (project.owner_id === user?.id || myProjectRole === 'owner' || myProjectRole === 'editor') : false;
  const canManage = user?.role === 'admin' || isProjectManager || task.creator_id === user?.id;
  const isLocked  = !isAssignee && !canManage && task.status !== 'open';
  const doneCount  = subtasks.filter(s => s.is_done).length;
  const totalCount = subtasks.length;

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const hasPreview = previewFiles.length > 0;

  // Panel styles — position:fixed gives iframe a real height (key insight from reference)
  const panelStyle = panelFullscreen
    ? { position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column', background:'var(--surface)' }
    : { position:'fixed', right:0, top:0, bottom:0, width:panelWidth, zIndex:100, display:'flex', flexDirection:'column', background:'var(--surface)', borderLeft:'0.5px solid var(--border)' };

  return (
    <div>
      {/* Left content — gets right margin when panel is open */}
      <div style={{ maxWidth:680, marginRight: hasPreview && !panelFullscreen ? panelWidth + 16 : 0 }}>

        {/* Back + actions bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => navigate(task.project_id ? `/projects/${task.project_id}` : '/tasks')}>
            <ArrowLeft size={12} />Назад
          </button>
          <div style={{ flex:1 }} />
          {canManage && (
            <>
              <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => navigate(`/tasks/${id}/edit`)}>
                <Pencil size={12} />Редактировать
              </button>
              <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={handleArchive}>
                <Archive size={12} />Архив
              </button>
              <button className="btn btn-danger" style={{ fontSize:12 }} onClick={handleDelete}>
                <Trash2 size={12} />Удалить
              </button>
            </>
          )}
        </div>

        {/* Title card */}
        <div className="detail-card">
          <div style={{ marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
            <span className={`badge ${STATUS_CLS[task.status]}`}>{STATUS_LABEL[task.status]}</span>
            <span className={`badge ${PRIORITY_CLS[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
          </div>
          <div className="detail-title">{task.title}</div>
          <div className="meta-grid">
            <div className="meta-item">
              <div className="meta-label">Приоритет</div>
              <div className="meta-value"><AlertCircle size={12} color="var(--rose)" />{PRIORITY_LABEL[task.priority]}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Исполнитель</div>
              <div className="meta-value">
                {task.assignee
                  ? <><div className="avatar-xs">{initials(task.assignee.name)}</div>{task.assignee.name.split(' ')[0]}</>
                  : <><User size={12} />Не назначен</>}
              </div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Дедлайн</div>
              <div className="meta-value"><Calendar size={12} />{task.deadline ? new Date(task.deadline).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' }) : 'Не задан'}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">Награда</div>
              <div className="meta-value" style={{ color:'#92400e' }}><Coins size={12} />{task.reward_points} баллов</div>
            </div>
            {task.category && (
              <div className="meta-item">
                <div className="meta-label">Категория</div>
                <div className="meta-value"><Tag size={12} />{task.category}</div>
              </div>
            )}
            <div className="meta-item">
              <div className="meta-label">Создал</div>
              <div className="meta-value"><User size={12} />{task.creator?.name}</div>
            </div>
          </div>
          {task.description && (
            <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, background:'var(--surface2)', borderRadius:'var(--r)', padding:12 }}>
              {task.description}
            </div>
          )}
          {task.rejection_reason && (
            <div style={{ background:'#fff1f2', border:'0.5px solid #fecdd3', borderRadius:'var(--r)', padding:10, fontSize:13, color:'var(--rose)', marginTop:12 }}>
              <strong>Причина отклонения:</strong> {task.rejection_reason}
            </div>
          )}
        </div>

        {/* Subtasks card */}
        <div className="detail-card">
          <div className="section-title" style={{ marginBottom:10 }}><ListChecks size={14} />Подзадачи</div>
          {totalCount > 0 && (
            <>
              <div className="progress-bar"><div className="progress-fill" style={{ width:`${(doneCount / totalCount) * 100}%` }} /></div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>{doneCount} из {totalCount} выполнено</div>
            </>
          )}
          {subtasks.map((s, index) => (
            <div
              key={s.id}
              className="subtask-item"
              draggable={!isLocked}
              onDragStart={!isLocked ? () => onDragStart(index) : undefined}
              onDragOver={!isLocked  ? (e) => onDragOver(e, index) : undefined}
              onDrop={!isLocked ? onDragEnd : undefined}
            >
              <input type="checkbox" checked={s.is_done} disabled={isLocked} onChange={() => !isLocked && toggleSubtask(s)} style={{ accentColor:'var(--emerald)' }} />
              <span style={{ fontSize:13, flex:1, textDecoration:s.is_done ? 'line-through' : 'none', color:s.is_done ? 'var(--text3)' : 'var(--text1)' }}>{s.title}</span>
              {!isLocked && (
                <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', display:'flex' }} onClick={() => deleteSubtask(s.id)}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          {!isLocked && (
            <form onSubmit={addSubtask} style={{ display:'flex', gap:6, marginTop:10 }}>
              <input className="form-input" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Новая подзадача..." style={{ flex:1, padding:'6px 10px' }} />
              <button type="submit" className="btn btn-primary" style={{ padding:'6px 12px' }}><Plus size={14} /></button>
            </form>
          )}
        </div>

        {/* Attachments card */}
        <div className="detail-card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div className="section-title" style={{ marginBottom:0 }}><Paperclip size={14} />Вложения</div>
            {!isLocked && (
              <label className="btn btn-ghost" style={{ fontSize:12, cursor:'pointer', padding:'4px 10px' }}>
                <Plus size={12} />Прикрепить
                <input ref={fileRef} type="file" style={{ display:'none' }} onChange={uploadFile} />
              </label>
            )}
          </div>
          {(!task.attachments || task.attachments.length === 0) && (
            <div style={{ fontSize:13, color:'var(--text3)' }}>Вложений нет</div>
          )}
          {task.attachments?.length > 0 && (
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>
              Ctrl+клик — открыть два файла рядом
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {task.attachments?.map(a => {
              const active = previewFiles.some(f => f.id === a.id);
              return (
                <div
                  key={a.id}
                  onClick={(e) => openFile(a, e)}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'9px 12px', borderRadius:'var(--r)',
                    border:`0.5px solid ${active ? 'var(--indigo)' : 'var(--border)'}`,
                    background: active ? '#eef2ff' : 'var(--surface2)',
                    cursor:'pointer', transition:'border-color 0.15s, background 0.15s',
                  }}
                >
                  {getFileIcon(a.mime_type, 16)}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color: active ? '#4338ca' : 'var(--text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {a.original_name}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>{formatSize(a.size)}</div>
                  </div>
                  {!isLocked && (
                    <button
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', display:'flex', flexShrink:0, padding:2 }}
                      onClick={e => { e.stopPropagation(); deleteAttachment(a.id); }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Review panel */}
        {canManage && task.status === 'review' && (
          <div className="review-panel">
            <div style={{ fontSize:13, fontWeight:500, color:'#6d28d9', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <ShieldCheck size={14} />Панель проверки
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:13, color:'var(--text2)' }}>Баллы:</span>
              <input className="form-input" type="number" min="0" value={approvePoints} onChange={e => setApprovePoints(e.target.value)} style={{ width:80, padding:'5px 8px' }} />
            </div>
            {showReject && (
              <div style={{ marginBottom:10 }}>
                <textarea className="form-input" placeholder="Причина отклонения..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ minHeight:60, marginBottom:6 }} />
                <button className="btn btn-danger btn-xs" onClick={handleReject}>Подтвердить отклонение</button>
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handleApprove}><Check size={14} />Подтвердить</button>
              <button className="btn btn-danger"  style={{ flex:1 }} onClick={() => setShowReject(!showReject)}><X size={14} />Отклонить</button>
            </div>
          </div>
        )}

        {/* Assignee actions */}
        {(!canManage || isAssignee) && (
          <>
            {task.status === 'open' && !isAssignee && !canManage && (
              <div style={{ marginBottom:12 }}>
                <button className="btn btn-primary" onClick={handleTake}>Взять в работу</button>
              </div>
            )}
            {task.status === 'in_progress' && isAssignee && (
              <div style={{ marginBottom:12 }}>
                <button className="btn btn-primary" onClick={handleSubmit}>Отправить на проверку</button>
              </div>
            )}
          </>
        )}

        {/* Comments card */}
        <div className="detail-card">
          <div className="section-title" style={{ marginBottom:12 }}><MessageCircle size={14} />Комментарии</div>
          {task.comments?.map(c => (
            <div key={c.id} className="comment">
              <div className="avatar" style={{ width:28, height:28, fontSize:10 }}>{initials(c.user?.name)}</div>
              <div className="comment-body">
                <div className="comment-meta">
                  {c.user?.name} · {new Date(c.created_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                  {!isLocked && (c.user_id === user?.id || canManage) && (
                    <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', marginLeft:6 }} onClick={() => deleteComment(c.id)}>×</button>
                  )}
                </div>
                <div className="comment-text">{c.content}</div>
              </div>
            </div>
          ))}
          {!task.comments?.length && <div style={{ fontSize:13, color:'var(--text3)', marginBottom:12 }}>Комментариев пока нет</div>}
          {!isLocked && (
            <form onSubmit={addComment} style={{ display:'flex', gap:8, marginTop:8 }}>
              <textarea className="form-input" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Написать комментарий..." style={{ flex:1, minHeight:60 }} />
              <button type="submit" className="btn btn-primary" style={{ alignSelf:'flex-end' }}><Send size={14} /></button>
            </form>
          )}
        </div>

        {/* History card */}
        {task.logs?.length > 0 && (
          <div className="detail-card">
            <div className="section-title" style={{ marginBottom:10 }}><History size={14} />История изменений</div>
            {task.logs.map(log => (
              <div key={log.id} className="history-item">
                <div className="history-dot" />
                <div>
                  <div className="history-text">{log.user?.name} — {log.comment}</div>
                  <div className="history-time">{new Date(log.created_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Fixed preview panel (position:fixed gives iframe real height) ── */}
      {hasPreview && (
        <div style={panelStyle}>
          {/* Horizontal drag handle — left edge (hidden in fullscreen) */}
          {!panelFullscreen && (
            <div
              onMouseDown={startResize}
              title="Потяните для изменения ширины"
              style={{
                position:'absolute', left:0, top:0, bottom:0,
                width:5, cursor:'ew-resize', zIndex:10,
                background:'transparent',
              }}
            />
          )}

          {/* Panel header */}
          <div style={{
            padding:'10px 14px', flexShrink:0,
            borderBottom:'0.5px solid var(--border)',
            display:'flex', alignItems:'center', gap:8,
            background:'var(--surface2)',
          }}>
            <span style={{ flex:1, fontSize:12, color:'var(--text2)', fontWeight:500 }}>
              {previewFiles.length === 1
                ? previewFiles[0].original_name
                : `${previewFiles.length} файла открыто`}
            </span>
            {/* Panel-level fullscreen (our feature) */}
            <button
              className="btn btn-ghost"
              style={{ padding:'4px 8px', flexShrink:0 }}
              onClick={() => setPanelFullscreen(f => !f)}
              title={panelFullscreen ? 'Свернуть (Esc)' : 'На весь экран'}
            >
              {panelFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding:'4px 8px', flexShrink:0 }}
              onClick={closeAllFiles}
              title="Закрыть все (Esc)"
            >
              <X size={13} />
            </button>
          </div>

          {/* First pane */}
          <FilePreviewPane
            key={previewFiles[0].id}
            file={previewFiles[0]}
            fileUrl={fileUrl}
            fileApiUrl={fileApiUrl}
            initialZoom={paneInitialZoom[previewFiles[0].id] ?? 1}
            isResizing={isResizing || isSplitResizing}
            paneStyle={previewFiles.length === 2
              ? { height:`${splitRatio * 100}%`, flex:'none' }
              : { flex:1 }}
            onClose={() => closeFile(previewFiles[0].id)}
            onDownload={downloadFile}
            onAutoResize={(w) => {
              if (previewFiles.length === 1)
                setPanelWidth(Math.min(Math.max(w, 400), maxPanelW()));
            }}
          />

          {/* Vertical split handle + second pane */}
          {previewFiles.length === 2 && (
            <>
              <div
                onMouseDown={startSplitResize}
                title="Потяните для изменения высоты"
                style={{
                  height:8, flexShrink:0, cursor:'ns-resize',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:'var(--surface2)',
                  borderTop:'0.5px solid var(--border)',
                  borderBottom:'0.5px solid var(--border)',
                }}
              >
                <div style={{ width:36, height:3, borderRadius:2, background:'var(--border)' }} />
              </div>

              <FilePreviewPane
                key={previewFiles[1].id}
                file={previewFiles[1]}
                fileUrl={fileUrl}
                fileApiUrl={fileApiUrl}
                initialZoom={paneInitialZoom[previewFiles[1].id] ?? 1}
                isResizing={isResizing || isSplitResizing}
                paneStyle={{ height:`${(1 - splitRatio) * 100}%`, flex:'none' }}
                onClose={() => closeFile(previewFiles[1].id)}
                onDownload={downloadFile}
                onAutoResize={() => {}}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
