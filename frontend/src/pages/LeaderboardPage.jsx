import { useEffect, useState } from 'react';
import { BarChart2, Medal, CircleCheck, Coins } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [leaders, setLeaders] = useState([]);

  useEffect(() => { api.get('/leaderboard').then(r => setLeaders(r.data)).catch(() => {}); }, []);

  const MEDAL_COLORS = ['#d97706', '#94a3b8', '#a16207'];
  const MEDAL_SIZES  = [18, 16, 14];

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><BarChart2 size={18} />Лидерборд</div>
      </div>

      {leaders.length === 0 ? (
        <div className="empty-state">Пока нет данных</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {leaders.map((u, i) => {
            const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const isMe = u.id === user?.id;
            return (
              <div key={u.id} className={`leaderboard-row${isMe ? ' me' : ''}`}>
                <div className="rank">
                  {i < 3 ? (
                    <Medal size={MEDAL_SIZES[i]} color={MEDAL_COLORS[i]} />
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>#{i + 1}</span>
                  )}
                </div>
                <div className="avatar">{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {u.name}
                    {isMe && <span style={{ fontSize: 11, color: 'var(--indigo)', marginLeft: 6 }}>(Вы)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>@{u.username}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CircleCheck size={12} />{u.completed_tasks} задач
                  </span>
                  <span style={{ fontSize: 13, color: '#92400e', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Coins size={12} />{u.balance}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
