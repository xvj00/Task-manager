import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function AdminPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [balances, setBalances] = useState([]);
  const [stats, setStats] = useState(null);
  const [manualForm, setManualForm] = useState({ user_id: '', amount: '', type: 'credit', description: '' });
  const [tab, setTab] = useState('users');

  const load = () => {
    api.get('/admin/stats').then(r => setStats(r.data));
    api.get('/admin/users').then(r => setUsers(r.data));
    api.get('/balances').then(r => setBalances(r.data));
  };

  useEffect(() => { if (user?.role === 'admin') load(); }, [user]);

  if (user?.role !== 'admin') return <div className="empty-state-big">⛔ Доступ запрещён</div>;

  const handleManual = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transactions/manual', { ...manualForm, amount: Number(manualForm.amount) });
      toast.success('Транзакция выполнена');
      setManualForm({ user_id: '', amount: '', type: 'credit', description: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const handleRoleChange = async (userId, role) => {
    try { await api.put(`/admin/users/${userId}`, { role }); toast.success('Роль изменена'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };
  const handleDelete = async (userId) => {
    if (!confirm('Удалить пользователя?')) return;
    try { await api.delete(`/admin/users/${userId}`); toast.success('Удалён'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const upd = f => e => setManualForm({...manualForm, [f]: e.target.value});
  const executors = users.filter(u => u.role !== 'admin');

  return (
    <div className="page">
      <div className="page-header"><h1>🛡 Панель администратора</h1></div>

      {stats && (
        <div className="stats-grid">
          {[
            { icon: '👥', val: stats.users,         label: 'Исполнителей'   },
            { icon: '📋', val: stats.tasks_total,   label: 'Всего задач'    },
            { icon: '⏳', val: stats.tasks_review,  label: 'На проверке'    },
            { icon: '✅', val: stats.tasks_done,    label: 'Выполнено'      },
            { icon: '💰', val: stats.points_issued, label: 'Баллов выдано'  },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="tabs">
        {['users', 'balances', 'manual'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'users' ? '👥 Пользователи' : t === 'balances' ? '💰 Балансы' : '⚡ Начисление'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <table className="admin-table">
          <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Баланс</th><th>Задач выполнено</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
                    <option value="user">Пользователь</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
                <td>💰 {u.balance}</td>
                <td>{u.completed_tasks}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Удалить</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'balances' && (
        <div className="balances-list">
          {balances.map((u, i) => (
            <div key={u.id} className="balance-row">
              <span className="balance-rank">#{i+1}</span>
              <span className="balance-name">{u.name}</span>
              <span className="balance-email">{u.email}</span>
              <span className="balance-amount">💰 {u.balance} баллов</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'manual' && (
        <form onSubmit={handleManual} className="form-card" style={{maxWidth: 500}}>
          <h3>Ручное начисление / списание</h3>
          <div className="form-group">
            <label>Пользователь *</label>
            <select value={manualForm.user_id} onChange={upd('user_id')} required>
              <option value="">Выберите исполнителя</option>
              {executors.map(u => <option key={u.id} value={u.id}>{u.name} (💰 {u.balance})</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Тип операции</label>
              <select value={manualForm.type} onChange={upd('type')}>
                <option value="credit">💚 Начислить</option>
                <option value="debit">🔴 Списать</option>
              </select>
            </div>
            <div className="form-group">
              <label>Количество баллов *</label>
              <input type="number" min="1" value={manualForm.amount} onChange={upd('amount')} required />
            </div>
          </div>
          <div className="form-group">
            <label>Описание *</label>
            <input type="text" value={manualForm.description} onChange={upd('description')} required placeholder="Причина начисления / списания" />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Выполнить</button>
          </div>
        </form>
      )}
    </div>
  );
}
