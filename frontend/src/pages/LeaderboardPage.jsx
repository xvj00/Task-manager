import { useEffect, useState } from 'react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [leaders, setLeaders] = useState([]);

  useEffect(() => { api.get('/leaderboard').then(r => setLeaders(r.data)); }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="page">
      <div className="page-header"><h1>🏆 Лидерборд</h1></div>

      {leaders.length === 0
        ? <p className="empty-state-big">Пока нет данных</p>
        : (
          <div className="leaderboard-list">
            {leaders.map((u, i) => (
              <div key={u.id} className={`lb-row ${u.id === user?.id ? 'lb-me' : ''}`}>
                <div className="lb-rank">{medals[i] || `#${i + 1}`}</div>
                <div className="lb-avatar">{u.name[0].toUpperCase()}</div>
                <div className="lb-name">{u.name} {u.id === user?.id && <span className="lb-you">(Вы)</span>}</div>
                <div className="lb-stats">
                  <span className="lb-completed">✅ {u.completed_tasks} задач</span>
                  <span className="lb-balance">💰 {u.balance} баллов</span>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
