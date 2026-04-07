import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const TYPE_LABELS = {
  task_assigned:  { icon: '📋', label: 'Назначена задача' },
  task_taken:     { icon: '🔄', label: 'Задачу взяли в работу' },
  task_review:    { icon: '✅', label: 'Задача на проверке' },
  task_approved:  { icon: '🏆', label: 'Задача подтверждена' },
  task_rejected:  { icon: '❌', label: 'Задача отклонена' },
  prize_requested: { icon: '🎁', label: 'Запрос на приз' },
  prize_approved:  { icon: '🎉', label: 'Приз одобрен' },
  prize_rejected:  { icon: '😞', label: 'Приз отклонён' },
  points_credited: { icon: '💚', label: 'Баллы начислены' },
  points_debited:  { icon: '🔴', label: 'Баллы списаны' },
  invite_accepted: { icon: '✅', label: 'Приглашение принято' },
  invite_declined: { icon: '❌', label: 'Приглашение отклонено' },
  project_invite:  { icon: '📨', label: 'Приглашение в проект' },
  folder_invite:   { icon: '📨', label: 'Приглашение в папку' },
  project_joined:  { icon: '👤', label: 'Новый участник проекта' },
};

const ROLE_LABELS = { owner: 'Владелец', editor: 'Соавтор', member: 'Пользователь' };

function getTitle(n) {
  const meta = TYPE_LABELS[n.type];
  return meta ? `${meta.icon} ${meta.label}` : n.type;
}

function getBody(n) {
  const d = n.data || {};
  if (d.task_title)   return `«${d.task_title}»`;
  if (d.prize_name)   return `«${d.prize_name}»`;
  if (d.project_name && d.inviter_name) return `от ${d.inviter_name} — «${d.project_name}» (роль: ${ROLE_LABELS[d.role] || d.role})`;
  if (d.folder_name && d.inviter_name)  return `от ${d.inviter_name} — «${d.folder_name}» (роль: ${ROLE_LABELS[d.role] || d.role})`;
  if (d.entity_name && d.user_name)     return `${d.user_name} — «${d.entity_name}»`;
  if (d.project_name) return `«${d.project_name}»`;
  if (d.folder_name)  return `«${d.folder_name}»`;
  return '';
}

function getPoints(n) {
  if (n.type === 'points_credited' || n.type === 'task_approved') return n.data?.points ?? n.data?.amount;
  if (n.type === 'points_debited')  return -(n.data?.amount ?? 0);
  return null;
}

function getLink(n) {
  const d = n.data || {};
  if (d.task_id)   return `/tasks/${d.task_id}`;
  if (d.entity_type === 'project' && d.entity_id) return `/projects/${d.entity_id}`;
  if (d.entity_type === 'folder'  && d.entity_id) return `/folders/${d.entity_id}`;
  if (d.project_id) return `/projects/${d.project_id}`;
  if (d.folder_id)  return `/folders/${d.folder_id}`;
  return null;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);
  if (min < 1)   return 'только что';
  if (min < 60)  return `${min} мин. назад`;
  if (hour < 24) return `${hour} ч. назад`;
  if (day < 7)   return `${day} дн. назад`;
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations]     = useState([]);
  const [tab, setTab]     = useState('all'); // all | invitations
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    await Promise.all([
      api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {}),
      api.get('/invitations').then(r => setInvitations(r.data)).catch(() => {}),
    ]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    load();
  };

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const handleClick = async (n) => {
    if (!n.read_at) await markRead(n.id);
    const link = getLink(n);
    if (link) navigate(link);
  };

  const handleAccept = async (inv) => {
    try {
      await api.post(`/invitations/${inv.id}/accept`);
      toast.success(`Вы вступили в «${inv.entity_name}»`);
      load();
      navigate(inv.type === 'project' ? `/projects/${inv.entity_id}` : `/folders/${inv.entity_id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleDecline = async (inv) => {
    try {
      await api.post(`/invitations/${inv.id}/decline`);
      toast.success('Приглашение отклонено');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const unread = notifications.filter(n => !n.read_at).length;

  return (
    <div className="page page-narrow-lg">
      <div className="page-header">
        <h1>🔔 Уведомления</h1>
        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            Прочитать все ({unread})
          </button>
        )}
      </div>

      {/* Табы */}
      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="view-switcher">
          <button className={`view-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
            Все {unread > 0 && <span className="notif-tab-badge">{unread}</span>}
          </button>
          <button className={`view-btn ${tab === 'invitations' ? 'active' : ''}`} onClick={() => setTab('invitations')}>
            Приглашения {invitations.length > 0 && <span className="notif-tab-badge invite">{invitations.length}</span>}
          </button>
        </div>
      </div>

      {loading && <div className="loading">Загрузка...</div>}

      {/* Вкладка приглашений */}
      {!loading && tab === 'invitations' && (
        <div className="notif-page-list">
          {invitations.length === 0 && (
            <div className="empty-state-big">📭 Активных приглашений нет</div>
          )}
          {invitations.map(inv => (
            <div key={inv.id} className="notif-page-invite">
              <div className="notif-page-invite-icon">📨</div>
              <div className="notif-page-invite-body">
                <div className="notif-page-invite-title">
                  {inv.inviter?.name} приглашает вас в {inv.type === 'project' ? 'проект' : 'папку'}
                </div>
                <div className="notif-page-invite-name">«{inv.entity_name}»</div>
                <div className="notif-page-invite-meta">
                  Роль: <strong>{ROLE_LABELS[inv.role] || inv.role}</strong>
                  <span className="notif-page-time">{timeAgo(inv.created_at)}</span>
                </div>
              </div>
              <div className="notif-page-invite-actions">
                <button className="btn btn-primary btn-sm" onClick={() => handleAccept(inv)}>Принять</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDecline(inv)}>Отклонить</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Вкладка всех уведомлений */}
      {!loading && tab === 'all' && (
        <div className="notif-page-list">
          {notifications.length === 0 && (
            <div className="empty-state-big">🔕 Уведомлений пока нет</div>
          )}
          {notifications.map(n => {
            const pts = getPoints(n);
            const link = getLink(n);
            return (
              <div
                key={n.id}
                className={`notif-page-item ${!n.read_at ? 'unread' : ''} ${link ? 'clickable' : ''}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-page-icon">{TYPE_LABELS[n.type]?.icon || '🔔'}</div>
                <div className="notif-page-body">
                  <div className="notif-page-title">{getTitle(n)}</div>
                  {getBody(n) && <div className="notif-page-desc">{getBody(n)}</div>}
                  {pts !== null && (
                    <div className={`notif-page-pts ${pts >= 0 ? 'positive' : 'negative'}`}>
                      {pts > 0 ? '+' : ''}{pts} баллов
                    </div>
                  )}
                </div>
                <div className="notif-page-right">
                  <div className="notif-page-time">{timeAgo(n.created_at)}</div>
                  {!n.read_at && <div className="notif-page-dot" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
