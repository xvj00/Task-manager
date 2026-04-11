import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../../api/axios';

export default function NotificationsBell() {
  const [totalBadge, setTotalBadge] = useState(0);
  const navigate = useNavigate();

  const load = () => {
    Promise.all([
      api.get('/notifications').catch(() => ({ data: [] })),
      api.get('/invitations').catch(() => ({ data: [] })),
    ]).then(([notif, inv]) => {
      const unread = notif.data.filter(n => !n.read_at).length;
      setTotalBadge(unread + inv.data.length);
    });
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <button
      className="bell-btn"
      onClick={() => navigate('/notifications')}
      title="Уведомления"
    >
      <Bell size={16} />
      {totalBadge > 0 && (
        <span className="bell-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>
      )}
    </button>
  );
}
