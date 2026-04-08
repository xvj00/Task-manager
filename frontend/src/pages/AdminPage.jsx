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
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy]         = useState('created_at');
  const [sortDir, setSortDir]       = useState('desc');

  // Модалка блокировки
  const [blockTarget, setBlockTarget]   = useState(null);
  const [blockReason, setBlockReason]   = useState('');

  // Апелляции
  const [appeals, setAppeals]           = useState([]);
  const [appealSearch, setAppealSearch] = useState('');
  const [appealSort, setAppealSort]     = useState('appeal_at');
  const [appealDir, setAppealDir]       = useState('desc');
  const [expandedAppeal, setExpandedAppeal] = useState(null);

  const load = () => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
  };

  const loadAppeals = () => {
    api.get('/admin/appeals').then(r => setAppeals(r.data)).catch(() => {});
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      load();
      loadAppeals();
    }
  }, [user]);

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

  /* ── Блокировка / разблокировка ── */
  const openBlockModal = (u) => { setBlockTarget(u); setBlockReason(''); };
  const closeBlockModal = () => { setBlockTarget(null); setBlockReason(''); };

  const handleBlock = async () => {
    if (!blockReason.trim()) { toast.error('Укажите причину блокировки'); return; }
    try {
      await api.put(`/admin/users/${blockTarget.id}/block`, { reason: blockReason.trim() });
      toast.success(`${blockTarget.name} заблокирован`);
      closeBlockModal();
      load();
      loadAppeals();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleUnblock = async (u) => {
    if (!confirm(`Разблокировать ${u.name}?`)) return;
    try {
      await api.put(`/admin/users/${u.id}/unblock`);
      toast.success(`${u.name} разблокирован`);
      load();
      loadAppeals();
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
    if (filterStatus === 'blocked')   list = list.filter(u => u.is_blocked);
    if (filterStatus === 'active')    list = list.filter(u => !u.is_blocked);

    list.sort((a, b) => {
      let va, vb;
      if (sortBy === 'name')       { va = a.name?.toLowerCase(); vb = b.name?.toLowerCase(); }
      else if (sortBy === 'balance') { va = a.balance; vb = b.balance; }
      else if (sortBy === 'tasks')   { va = a.completed_tasks; vb = b.completed_tasks; }
      else { va = new Date(a.created_at); vb = new Date(b.created_at); }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, filterRole, filterStatus, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };
  const sortIcon = (field) => sortBy === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const handleRoleChange = async (userId, role) => {
    try { await api.put(`/admin/users/${userId}`, { role }); toast.success('Роль изменена'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  /* ── Апелляции фильтрация/сортировка ── */
  const filteredAppeals = useMemo(() => {
    let list = [...appeals];
    const q = appealSearch.toLowerCase();
    if (q) {
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.appeal_text?.toLowerCase().includes(q) ||
        u.block_reason?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va, vb;
      if (appealSort === 'name')    { va = a.name?.toLowerCase(); vb = b.name?.toLowerCase(); }
      else if (appealSort === 'appeal_at') { va = new Date(a.appeal_at); vb = new Date(b.appeal_at); }
      else { va = new Date(a.created_at); vb = new Date(b.created_at); }

      if (va < vb) return appealDir === 'asc' ? -1 : 1;
      if (va > vb) return appealDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [appeals, appealSearch, appealSort, appealDir]);

  const toggleAppealSort = (field) => {
    if (appealSort === field) setAppealDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setAppealSort(field); setAppealDir('desc'); }
  };
  const appealSortIcon = (field) => appealSort === field ? (appealDir === 'asc' ? ' ↑' : ' ↓') : '';

  const pendingAppealsCount = appeals.filter(u => u.is_blocked).length;

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
        {[
          ['users',   '👥 Пользователи'],
          ['manual',  '⚡ Начисление'],
          ['appeals', `📋 Апелляции${pendingAppealsCount > 0 ? ` (${pendingAppealsCount})` : ''}`],
        ].map(([t, label]) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Пользователи ── */}
      {tab === 'users' && (
        <>
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
            <select className="admin-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
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
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Ничего не найдено</td></tr>
              )}
              {filteredUsers.map(u => (
                <tr key={u.id} className={`${u.id === user.id ? 'admin-row-self' : ''} ${u.is_blocked ? 'admin-row-blocked' : ''}`}>
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
                    {u.is_blocked
                      ? <span className="user-status-blocked">🚫 Заблок.</span>
                      : <span className="user-status-active">✅ Активен</span>
                    }
                  </td>
                  <td>
                    {u.id !== user.id && (
                      u.is_blocked
                        ? <button className="btn btn-secondary btn-sm" onClick={() => handleUnblock(u)}>Разблокировать</button>
                        : <button className="btn btn-danger btn-sm" onClick={() => openBlockModal(u)}>Заблокировать</button>
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

      {/* ── Апелляции ── */}
      {tab === 'appeals' && (
        <div>
          <div className="admin-filters">
            <input
              className="admin-search-input"
              type="text"
              placeholder="🔍 Поиск по имени, тексту апелляции, причине..."
              value={appealSearch}
              onChange={e => setAppealSearch(e.target.value)}
            />
            <span className="admin-filter-count">{filteredAppeals.length} апелляций</span>
          </div>

          {filteredAppeals.length === 0 ? (
            <p className="empty-state-big">📋 Апелляций пока нет</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleAppealSort('name')}>Пользователь{appealSortIcon('name')}</th>
                  <th>Email</th>
                  <th>Причина блокировки</th>
                  <th className="sortable" onClick={() => toggleAppealSort('appeal_at')}>Дата апелляции{appealSortIcon('appeal_at')}</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredAppeals.map(u => (
                  <>
                    <tr key={u.id} className={u.is_blocked ? 'admin-row-blocked' : ''}>
                      <td>
                        <strong>{u.name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</div>
                      </td>
                      <td className="admin-email">{u.email}</td>
                      <td style={{ maxWidth: 200, fontSize: 13 }}>{u.block_reason || '—'}</td>
                      <td className="admin-date">
                        {u.appeal_at ? new Date(u.appeal_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        {u.is_blocked
                          ? <span className="user-status-blocked">🚫 Заблок.</span>
                          : <span className="user-status-active">✅ Разблок.</span>
                        }
                      </td>
                      <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setExpandedAppeal(expandedAppeal === u.id ? null : u.id)}
                        >
                          {expandedAppeal === u.id ? 'Свернуть' : 'Читать'}
                        </button>
                        {u.is_blocked && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleUnblock(u)}>
                            Разблокировать
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedAppeal === u.id && (
                      <tr key={`${u.id}-appeal`} className="appeal-expand-row">
                        <td colSpan={6}>
                          <div className="appeal-expand-content">
                            <div className="appeal-expand-label">Текст апелляции:</div>
                            <div className="appeal-expand-text">{u.appeal_text}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Модалка блокировки ── */}
      {blockTarget && (
        <div className="modal-overlay" onClick={closeBlockModal}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Заблокировать пользователя</h3>
            <div className="found-user-card" style={{ marginBottom: 16 }}>
              <div className="found-user-avatar">{blockTarget.name?.[0]?.toUpperCase()}</div>
              <div className="found-user-info">
                <div className="found-user-name">{blockTarget.name}</div>
                <div className="found-user-meta">@{blockTarget.username} · {blockTarget.email}</div>
              </div>
            </div>
            <div className="form-group">
              <label>Причина блокировки *</label>
              <textarea
                rows={4}
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Укажите причину блокировки пользователя..."
                maxLength={1000}
                autoFocus
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{blockReason.length} / 1000</div>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={closeBlockModal}>Отмена</button>
              <button className="btn btn-danger" onClick={handleBlock} disabled={!blockReason.trim()}>
                🚫 Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
