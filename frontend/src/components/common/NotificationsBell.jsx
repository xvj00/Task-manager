import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const TYPE_LABELS = {
  task_assigned:  '📋 Вам назначена задача',
  task_taken:     '🔄 Задачу взяли в работу',
  task_review:    '✅ Задача на проверке',
  task_approved:  '🏆 Задача подтверждена!',
  task_rejected:  '❌ Задача отклонена',
  prize_requested: '🎁 Запрос на приз',
  prize_approved:  '🎉 Приз одобрен!',
  prize_rejected:  '😞 Приз отклонён',
  points_credited: '💚 Баллы начислены',
  points_debited:  '🔴 Баллы списаны',
  invite_accepted: '✅ Приглашение принято',
  invite_declined: '❌ Приглашение отклонено',
};

const ROLE_LABELS = { owner: 'Владелец', editor: 'Соавтор', member: 'Пользователь' };

function formatType(n) {
  const base = TYPE_LABELS[n.type] || n.type;
  if (n.data?.task_title)   return `${base}: «${n.data.task_title}»`;
  if (n.data?.prize_name)   return `${base}: «${n.data.prize_name}»`;
  if (n.data?.entity_name)  return `${base} — «${n.data.entity_name}» (${n.data.user_name})`;
  return base;
}

export default function NotificationsBell() {
  const [notifications, setNotifications]   = useState([]);
  const [invitations, setInvitations]       = useState([]);
  const [open, setOpen]                     = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const unread = notifications.filter(n => !n.read_at).length;
  const totalBadge = unread + invitations.length;

  const load = () => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
    api.get('/invitations').then(r => setInvitations(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    load();
  };

  const handleNotifClick = async (n) => {
    if (!n.read_at) await api.post(`/notifications/${n.id}/read`).catch(() => {});
    setOpen(false);
    if (n.data?.task_id)      navigate(`/tasks/${n.data.task_id}`);
    else if (n.data?.entity_id && n.data?.entity_type === 'project') navigate(`/projects/${n.data.entity_id}`);
    else if (n.data?.entity_id && n.data?.entity_type === 'folder')  navigate(`/folders/${n.data.entity_id}`);
    load();
  };

  const handleAccept = async (inv) => {
    try {
      await api.post(`/invitations/${inv.id}/accept`);
      toast.success(`Вы вступили в ${inv.type === 'project' ? 'проект' : 'папку'} «${inv.entity_name}»`);
      load();
      if (inv.type === 'project') navigate(`/projects/${inv.entity_id}`);
      else navigate(`/folders/${inv.entity_id}`);
      setOpen(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleDecline = async (inv) => {
    try {
      await api.post(`/invitations/${inv.id}/decline`);
      toast.success('Приглашение отклонено');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell-btn" onClick={() => setOpen(o => !o)} title="Уведомления">
        🔔
        {totalBadge > 0 && <span className="notif-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Уведомления</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unread > 0 && <button className="notif-read-all" onClick={markAllRead}>Прочитать все</button>}
              <Link to="/notifications" className="notif-view-all" onClick={() => setOpen(false)}>Все →</Link>
            </div>
          </div>

          {/* Блок приглашений */}
          {invitations.length > 0 && (
            <div className="notif-invites-section">
              <div className="notif-invites-title">📨 Приглашения ({invitations.length})</div>
              {invitations.map(inv => (
                <div key={inv.id} className="notif-invite-item">
                  <div className="notif-invite-info">
                    <div className="notif-invite-text">
                      <strong>{inv.inviter?.name}</strong> приглашает вас в {inv.type === 'project' ? 'проект' : 'папку'}
                    </div>
                    <div className="notif-invite-name">«{inv.entity_name}»</div>
                    <div className="notif-invite-role">Роль: {ROLE_LABELS[inv.role] || inv.role}</div>
                  </div>
                  <div className="notif-invite-actions">
                    <button className="btn btn-primary btn-xs" onClick={() => handleAccept(inv)}>Принять</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => handleDecline(inv)}>Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Обычные уведомления */}
          <div className="notif-list">
            {notifications.length === 0 && invitations.length === 0 && (
              <div className="notif-empty">Уведомлений нет</div>
            )}
            {notifications.length === 0 && invitations.length > 0 && (
              <div className="notif-empty">Других уведомлений нет</div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${!n.read_at ? 'unread' : ''}`}
                onClick={() => handleNotifClick(n)}
              >
                <div className="notif-text">{formatType(n)}</div>
                {(n.data?.points > 0 || n.data?.amount > 0) && (
                  <div className="notif-points">
                    {n.type === 'points_debited' ? '-' : '+'}{n.data.points ?? n.data.amount} баллов
                  </div>
                )}
                <div className="notif-time">
                  {new Date(n.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
