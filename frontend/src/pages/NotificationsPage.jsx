import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CircleCheck, Zap, Shield, Gift, Coins, Users, XCircle, ClipboardList } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const TYPE_META = {
  task_approved:   { label: 'Задача подтверждена', Icon: CircleCheck, bg: '#ecfdf5', color: '#059669' },
  task_review:     { label: 'Задача на проверке',  Icon: Shield,      bg: '#f5f3ff', color: '#7c3aed' },
  task_taken:      { label: 'Задача взята в работу', Icon: Zap,        bg: '#fffbeb', color: '#d97706' },
  task_assigned:   { label: 'Вам назначена задача', Icon: ClipboardList, bg: '#eef2ff', color: '#4f46e5' },
  task_rejected:   { label: 'Задача отклонена',    Icon: XCircle,     bg: '#fff1f2', color: '#e11d48' },
  prize_approved:  { label: 'Приз одобрен',        Icon: Gift,        bg: '#fffbeb', color: '#d97706' },
  prize_requested: { label: 'Запрос на приз',      Icon: Gift,        bg: '#fffbeb', color: '#d97706' },
  prize_rejected:  { label: 'Приз отклонён',       Icon: XCircle,     bg: '#fff1f2', color: '#e11d48' },
  points_credited: { label: 'Баллы начислены',     Icon: Coins,       bg: '#ecfdf5', color: '#059669' },
  points_debited:  { label: 'Баллы списаны',       Icon: Coins,       bg: '#fff1f2', color: '#e11d48' },
  invite_accepted: { label: 'Приглашение принято', Icon: Users,       bg: '#eef2ff', color: '#4f46e5' },
  invite_declined: { label: 'Приглашение отклонено', Icon: XCircle,   bg: '#fff1f2', color: '#e11d48' },
};

const ROLE_LABELS = { owner: 'Владелец', editor: 'Соавтор', member: 'Пользователь' };

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

function formatTitle(n) {
  const meta = TYPE_META[n.type];
  return meta?.label || n.type;
}

function formatDesc(n) {
  const d = n.data || {};
  const parts = [];
  if (d.task_title)   parts.push(`«${d.task_title}»`);
  if (d.prize_name)   parts.push(`«${d.prize_name}»`);
  if (d.entity_name)  parts.push(`«${d.entity_name}»`);
  if (d.points > 0)   parts.push(`начислено ${d.points} баллов`);
  if (d.amount > 0 && n.type === 'points_credited') parts.push(`начислено ${d.amount} баллов`);
  if (d.amount > 0 && n.type === 'points_debited')  parts.push(`списано ${d.amount} баллов`);
  if (d.actor_name)   parts.push(`от ${d.actor_name}`);
  return parts.join(' — ') || '';
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

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations]     = useState([]);
  const [tab, setTab]     = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    await Promise.all([
      api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {}),
      api.get('/invitations').then(r => setInvitations(r.data)).catch(() => {}),
    ]);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    load();
  };

  const handleClick = async (n) => {
    if (!n.read_at) await api.post(`/notifications/${n.id}/read`).catch(() => {});
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
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
    <div>
      <div className="page-header">
        <div className="page-title"><Bell size={18} />Уведомления</div>
        {unread > 0 && (
          <button className="btn btn-ghost" onClick={markAllRead}>
            <CheckCheck size={14} />Прочитать все ({unread})
          </button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          Все {unread > 0 && `[${unread}]`}
        </button>
        <button className={`tab${tab === 'invitations' ? ' active' : ''}`} onClick={() => setTab('invitations')}>
          Приглашения {invitations.length > 0 && `[${invitations.length}]`}
        </button>
      </div>

      {loading && <div style={{ color: 'var(--text3)', padding: 24 }}>Загрузка...</div>}

      {!loading && tab === 'invitations' && (
        <div>
          {invitations.length === 0 && <div className="empty-state">Активных приглашений нет</div>}
          {invitations.map(inv => (
            <div key={inv.id} className="notif-item">
              <div className="notif-icon-box" style={{ background: 'var(--indigo-l)' }}>
                <Users size={15} color="var(--indigo)" />
              </div>
              <div className="notif-body">
                <div className="notif-title">
                  {inv.inviter?.name} приглашает вас в {inv.type === 'project' ? 'проект' : 'папку'}
                </div>
                <div className="notif-desc">«{inv.entity_name}» — роль: <strong>{ROLE_LABELS[inv.role] || inv.role}</strong></div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-primary btn-xs" onClick={() => handleAccept(inv)}>Принять</button>
                <button className="btn btn-ghost btn-xs" onClick={() => handleDecline(inv)}>Отклонить</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'all' && (
        <div>
          {notifications.length === 0 && <div className="empty-state">Уведомлений пока нет</div>}
          {notifications.map(n => {
            const meta = TYPE_META[n.type];
            const Icon = meta?.Icon;
            const link = getLink(n);
            return (
              <div
                key={n.id}
                className="notif-item"
                style={{
                  cursor: link ? 'pointer' : 'default',
                  opacity: n.read_at ? 0.7 : 1,
                }}
                onClick={() => handleClick(n)}
              >
                {Icon && (
                  <div className="notif-icon-box" style={{ background: meta.bg }}>
                    <Icon size={15} color={meta.color} />
                  </div>
                )}
                <div className="notif-body">
                  <div className="notif-title">{formatTitle(n)}</div>
                  {formatDesc(n) && (
                    <div className="notif-desc">{formatDesc(n)}</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <div className="notif-time">{timeAgo(n.created_at)}</div>
                  {!n.read_at && <div className="notif-dot" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
