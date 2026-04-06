import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const TYPE_LABELS = {
  task_assigned:   '📋 Вам назначена задача',
  task_taken:      '🔄 Задачу взяли в работу',
  task_review:     '✅ Задача на проверке',
  task_approved:   '🏆 Задача подтверждена!',
  task_rejected:   '❌ Задача отклонена',
  prize_requested:  '🎁 Запрос на приз',
  prize_approved:   '🎉 Приз одобрен!',
  prize_rejected:   '😞 Приз отклонён',
  points_credited:  '💚 Баллы начислены',
  points_debited:   '🔴 Баллы списаны',
};

function formatType(n) {
  const base = TYPE_LABELS[n.type] || n.type;
  if (n.data?.task_title) return `${base}: «${n.data.task_title}»`;
  if (n.data?.prize_name) return `${base}: «${n.data.prize_name}»`;
  return base;
}

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const unread = notifications.filter(n => !n.read_at).length;

  const load = () => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    load();
  };

  const handleClick = async (n) => {
    if (!n.read_at) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {});
    }
    setOpen(false);
    if (n.data?.task_id) navigate(`/tasks/${n.data.task_id}`);
    load();
  };

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell-btn" onClick={handleOpen} title="Уведомления">
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Уведомления</span>
            {unread > 0 && (
              <button className="notif-read-all" onClick={markAllRead}>Прочитать все</button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">Уведомлений нет</div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${!n.read_at ? 'unread' : ''}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-text">{formatType(n)}</div>
                {(n.data?.points > 0 || n.data?.amount > 0) && (
                  <div className="notif-points">
                    {n.type === 'points_debited' ? '-' : '+'}{n.data.points ?? n.data.amount} баллов
                  </div>
                )}
                <div className="notif-time">
                  {new Date(n.created_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
