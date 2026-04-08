import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function AdminPage() {
  const { user } = useAuthStore();
  const [users, setUsers]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [tab, setTab]       = useState('users');

  // Форма начисления
  const [usernameInput, setUsernameInput] = useState('');
  const [foundUser, setFoundUser]         = useState(null);
  const [lookupError, setLookupError]     = useState('');
  const [manualForm, setManualForm]       = useState({ amount: '', type: 'credit', description: '' });

  // Фильтры пользователей
  const [search, setSearch]     = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy]     = useState('created_at');
  const [sortDir, setSortDir]   = useState('desc');

  const load = () => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
  };

  useEffect(() => { if (user?.role === 'admin') load(); }, [user]);

  if (user?.role !== 'admin') return <div className="empty-state-big">⛔ Доступ запрещён</div>;

  /* ── Поиск пользователя по никнейму ── */
  const handleLookup = () => {
    const q = usernameInput.trim().replace(/^@/, '');
    if (!q) { setLookupError('Введите никнейм'); return; }
    const found = users.find(u =>
      u.username?.toLowerCase() === q.toLowerCase() ||
      u.name?.toLowerCase() === q.toLowerCase()
    );
    if (found) { setFoundUser(found); setLookupError(''); }
    else { setFoundUser(null); setLookupError(`Пользователь «${q}» не найден`); }
  };

  const handleManual = async (e) => {
    e.preventDefault();
    if (!foundUser) { toast.error('Сначала найдите пользователя'); return; }
    try {
      await api.post('/transactions/manual', {
        user_id:     foundUser.id,
        amount:      Number(manualForm.amount),
        type:        manualForm.type,
        description: manualForm.description,
      });
      toast.success(`${manualForm.type === 'credit' ? 'Начислено' : 'Списано'} ${manualForm.amount} баллов — ${foundUser.name}`);
      setFoundUser(null);
      setUsernameInput('');
      setManualForm({ amount: '', type: 'credit', description: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  /* ── Фильтрация/сортировка пользователей ── */
  const filteredUsers = useMemo(() => {
    let list = [...users];
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (filterRole !== 'all') list = list.filter(u => u.role === filterRole);

    list.sort((a, b) => {
      let va, vb;
      if (sortBy === 'name')       { va = a.name?.toLowerCase(); vb = b.name?.toLowerCase(); }
      else if (sortBy === 'balance') { va = a.balance; vb = b.balance; }
      else if (sortBy === 'tasks')   { va = a.completed_tasks; vb = b.completed_tasks; }
      else { va = new Date(a.created_at); vb = new Date(b.created_at); } // created_at

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, filterRole, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };
  const sortIcon = (field) => sortBy === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const handleRoleChange = async (userId, role) => {
    try { await api.put(`/admin/users/${userId}`, { role }); toast.success('Роль изменена'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };
  const handleDelete = async (userId) => {
    if (!confirm('Удалить пользователя?')) return;
    try { await api.delete(`/admin/users/${userId}`); toast.success('Удалён'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>🛡 Панель администратора</h1></div>

      {stats && (
        <div className="stats-grid">
          {[
            { icon: '👥', val: stats.users,         label: 'Пользователей' },
            { icon: '📋', val: stats.tasks_total,   label: 'Всего задач'   },
            { icon: '⏳', val: stats.tasks_review,  label: 'На проверке'   },
            { icon: '✅', val: stats.tasks_done,    label: 'Выполнено'     },
            { icon: '💰', val: stats.points_issued, label: 'Баллов выдано' },
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
        {[['users', '👥 Пользователи'], ['manual', '⚡ Начисление']].map(([t, label]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Пользователи ── */}
      {tab === 'users' && (
        <>
          {/* Панель поиска и фильтрации */}
          <div className="admin-filters">
            <input
              className="admin-search-input"
              type="text"
              placeholder="🔍 Поиск по имени, @никнейму, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="admin-filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">Все роли</option>
              <option value="user">Пользователи</option>
              <option value="admin">Администраторы</option>
            </select>
            <span className="admin-filter-count">{filteredUsers.length} из {users.length}</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('name')}>Имя{sortIcon('name')}</th>
                <th>@Никнейм</th>
                <th>Email</th>
                <th className="sortable" onClick={() => toggleSort('created_at')}>Регистрация{sortIcon('created_at')}</th>
                <th className="sortable" onClick={() => toggleSort('balance')}>Баланс{sortIcon('balance')}</th>
                <th className="sortable" onClick={() => toggleSort('tasks')}>Задач{sortIcon('tasks')}</th>
                <th>Роль</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Ничего не найдено</td></tr>
              )}
              {filteredUsers.map(u => (
                <tr key={u.id} className={u.id === user.id ? 'admin-row-self' : ''}>
                  <td><strong>{u.name}</strong></td>
                  <td><span className="admin-username">@{u.username || '—'}</span></td>
                  <td className="admin-email">{u.email}</td>
                  <td className="admin-date">{u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}</td>
                  <td><span className="admin-balance">💰 {u.balance}</span></td>
                  <td>{u.completed_tasks}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={u.id === user.id}
                    >
                      <option value="user">Пользователь</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </td>
                  <td>
                    {u.id !== user.id && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Удалить</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── Начисление / списание ── */}
      {tab === 'manual' && (
        <form onSubmit={handleManual} className="form-card" style={{ maxWidth: 500 }}>
          <h3>Ручное начисление / списание</h3>

          {/* Поиск по никнейму */}
          <div className="form-group">
            <label>Никнейм пользователя *</label>
            <div className="manual-lookup-row">
              <input
                type="text"
                value={usernameInput}
                onChange={e => { setUsernameInput(e.target.value); setFoundUser(null); setLookupError(''); }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
                placeholder="@nickname или имя"
              />
              <button type="button" className="btn btn-secondary" onClick={handleLookup}>Найти</button>
            </div>
            {lookupError && <div className="lookup-error">{lookupError}</div>}
          </div>

          {/* Карточка найденного пользователя */}
          {foundUser && (
            <div className="found-user-card">
              <div className="found-user-avatar">{foundUser.name?.[0]?.toUpperCase()}</div>
              <div className="found-user-info">
                <div className="found-user-name">{foundUser.name}</div>
                <div className="found-user-meta">@{foundUser.username} · 💰 {foundUser.balance} баллов</div>
              </div>
              <span className="found-user-check">✓</span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Операция</label>
              <select value={manualForm.type} onChange={e => setManualForm({ ...manualForm, type: e.target.value })}>
                <option value="credit">💚 Начислить</option>
                <option value="debit">🔴 Списать</option>
              </select>
            </div>
            <div className="form-group">
              <label>Баллов *</label>
              <input
                type="number" min="1"
                value={manualForm.amount}
                onChange={e => setManualForm({ ...manualForm, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Описание *</label>
            <input
              type="text"
              value={manualForm.description}
              onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
              required
              placeholder="Причина начисления / списания"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={!foundUser}>
              {manualForm.type === 'credit' ? '💚 Начислить' : '🔴 Списать'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
