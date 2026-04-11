import { useEffect, useMemo, useState } from 'react';
import { Settings2, Users, ClipboardList, Clock, CircleCheck, Coins, Search, Zap, FileText, CheckCircle, Ban, Unlock, PlusCircle, AlertCircle } from 'lucide-react';

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error"><AlertCircle size={11} />{msg}</div>;
}
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function AdminPage() {
  const { user } = useAuthStore();
  const [users, setUsers]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [tab, setTab]       = useState('users');

  const [usernameInput, setUsernameInput] = useState('');
  const [foundUser, setFoundUser]         = useState(null);
  const [lookupError, setLookupError]     = useState('');
  const [manualForm, setManualForm]       = useState({ amount: '', type: 'credit', description: '' });
  const [manualErrors, setManualErrors]   = useState({});

  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy]         = useState('created_at');
  const [sortDir, setSortDir]       = useState('desc');

  const [blockTarget, setBlockTarget]   = useState(null);
  const [blockReason, setBlockReason]   = useState('');

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
    if (user?.role === 'admin') { load(); loadAppeals(); }
  }, [user]);

  const filteredUsers = useMemo(() => {
    let list = [...users];
    const q = search.toLowerCase();
    if (q) list = list.filter(u => u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    if (filterRole !== 'all') list = list.filter(u => u.role === filterRole);
    if (filterStatus === 'blocked') list = list.filter(u => u.is_blocked);
    if (filterStatus === 'active')  list = list.filter(u => !u.is_blocked);
    list.sort((a, b) => {
      let va, vb;
      if (sortBy === 'name')     { va = a.name?.toLowerCase(); vb = b.name?.toLowerCase(); }
      else if (sortBy === 'balance') { va = a.balance; vb = b.balance; }
      else if (sortBy === 'tasks')   { va = a.completed_tasks; vb = b.completed_tasks; }
      else { va = new Date(a.created_at); vb = new Date(b.created_at); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, filterRole, filterStatus, sortBy, sortDir]);

  const filteredAppeals = useMemo(() => {
    let list = [...appeals];
    const q = appealSearch.toLowerCase();
    if (q) list = list.filter(u => u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.appeal_text?.toLowerCase().includes(q) || u.block_reason?.toLowerCase().includes(q));
    list.sort((a, b) => {
      let va, vb;
      if (appealSort === 'name')       { va = a.name?.toLowerCase(); vb = b.name?.toLowerCase(); }
      else if (appealSort === 'appeal_at') { va = new Date(a.appeal_at); vb = new Date(b.appeal_at); }
      else { va = new Date(a.created_at); vb = new Date(b.created_at); }
      if (va < vb) return appealDir === 'asc' ? -1 : 1;
      if (va > vb) return appealDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [appeals, appealSearch, appealSort, appealDir]);

  const pendingAppealsCount = appeals.filter(u => u.is_blocked).length;

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const handleRoleChange = async (userId, role) => {
    try { await api.put(`/admin/users/${userId}`, { role }); toast.success('Роль изменена'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleLookup = () => {
    const q = usernameInput.trim().replace(/^@/, '');
    if (!q) { setLookupError('Введите никнейм'); return; }
    const found = users.find(u => u.username?.toLowerCase() === q.toLowerCase() || u.name?.toLowerCase() === q.toLowerCase());
    if (found) { setFoundUser(found); setLookupError(''); }
    else { setFoundUser(null); setLookupError(`Пользователь «${q}» не найден`); }
  };

  const validateManual = () => {
    const errs = {};
    if (!foundUser) errs._user = 'Сначала найдите пользователя';
    const amt = Number(manualForm.amount);
    if (!manualForm.amount) {
      errs.amount = 'Укажите количество баллов';
    } else if (!Number.isInteger(amt) || amt < 1) {
      errs.amount = 'Целое число ≥ 1';
    } else if (amt > 1000000) {
      errs.amount = 'Максимум 1 000 000 баллов';
    }
    if (!manualForm.description.trim()) {
      errs.description = 'Укажите причину';
    } else if (manualForm.description.trim().length > 200) {
      errs.description = 'Максимум 200 символов';
    }
    return errs;
  };

  const handleManual = async (e) => {
    e.preventDefault();
    const errs = validateManual();
    if (Object.keys(errs).length > 0) { setManualErrors(errs); if (errs._user) toast.error(errs._user); return; }
    setManualErrors({});
    try {
      await api.post('/transactions/manual', { user_id: foundUser.id, amount: Number(manualForm.amount), type: manualForm.type, description: manualForm.description.trim() });
      toast.success(`${manualForm.type === 'credit' ? 'Начислено' : 'Списано'} ${manualForm.amount} баллов — ${foundUser.name}`);
      setFoundUser(null); setUsernameInput(''); setManualForm({ amount: '', type: 'credit', description: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const openBlockModal = (u) => { setBlockTarget(u); setBlockReason(''); };
  const closeBlockModal = () => { setBlockTarget(null); setBlockReason(''); };

  const handleBlock = async () => {
    if (!blockReason.trim()) { toast.error('Укажите причину блокировки'); return; }
    try {
      await api.put(`/admin/users/${blockTarget.id}/block`, { reason: blockReason.trim() });
      toast.success(`${blockTarget.name} заблокирован`);
      closeBlockModal(); load(); loadAppeals();
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  const handleUnblock = async (u) => {
    if (!confirm(`Разблокировать ${u.name}?`)) return;
    try { await api.put(`/admin/users/${u.id}/unblock`); toast.success(`${u.name} разблокирован`); load(); loadAppeals(); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
  };

  if (user?.role !== 'admin') return <div className="empty-state" style={{ padding: 48 }}>Доступ запрещён</div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><Settings2 size={18} />Администратор</div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon"><Users size={18} /></div><div className="stat-label">Пользователей</div><div className="stat-value">{stats.users}</div></div>
          <div className="stat-card"><div className="stat-icon"><ClipboardList size={18} /></div><div className="stat-label">Всего задач</div><div className="stat-value">{stats.tasks_total}</div></div>
          <div className="stat-card"><div className="stat-icon"><Clock size={18} /></div><div className="stat-label">На проверке</div><div className="stat-value">{stats.tasks_review}</div></div>
          <div className="stat-card"><div className="stat-icon"><CircleCheck size={18} color="var(--emerald)" /></div><div className="stat-label">Выполнено</div><div className="stat-value">{stats.tasks_done}</div></div>
          <div className="stat-card"><div className="stat-icon"><Coins size={18} color="var(--amber)" /></div><div className="stat-label">Баллов выдано</div><div className="stat-value">{stats.points_issued >= 1000 ? `${(stats.points_issued / 1000).toFixed(0)}k` : stats.points_issued}</div></div>
        </div>
      )}

      <div className="tabs">
        <button className={`tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
          <Users size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Пользователи
        </button>
        <button className={`tab${tab === 'manual' ? ' active' : ''}`} onClick={() => setTab('manual')}>
          <Zap size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Начисление
        </button>
        <button className={`tab${tab === 'appeals' ? ' active' : ''}`} onClick={() => setTab('appeals')}>
          <FileText size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Апелляции {pendingAppealsCount > 0 && `[${pendingAppealsCount}]`}
        </button>
      </div>

      {/* Пользователи */}
      {tab === 'users' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
              <span className="search-icon-pos"><Search size={14} /></span>
              <input className="search-input" placeholder="Поиск по имени, @нику, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
            </div>
            <select className="filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">Все роли</option>
              <option value="user">Пользователи</option>
              <option value="admin">Администраторы</option>
            </select>
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
            </select>
            <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>{filteredUsers.length} из {users.length}</span>
          </div>
          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>Имя</th>
                  <th>@Никнейм</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('balance')}>Баланс</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('tasks')}>Задач</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>Ничего не найдено</td></tr>
                )}
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div className="avatar" style={{ width: 26, height: 26, fontSize: 9 }}>
                          {u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>@{u.username || '—'}</td>
                    <td style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>{u.balance}</td>
                    <td style={{ fontSize: 12 }}>{u.completed_tasks}</td>
                    <td>
                      <select
                        className="filter-select"
                        style={{ fontSize: 11 }}
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === user.id}
                      >
                        <option value="user">Пользователь</option>
                        <option value="admin">Администратор</option>
                      </select>
                    </td>
                    <td>
                      {u.is_blocked ? (
                        <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--rose)' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--rose)', display: 'inline-block' }} />Заблок.
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--emerald)' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />Активен
                        </span>
                      )}
                    </td>
                    <td>
                      {u.id !== user.id && (
                        u.is_blocked ? (
                          <button className="btn btn-ghost btn-xs" onClick={() => handleUnblock(u)}><Unlock size={12} />Разблок.</button>
                        ) : (
                          <button className="btn btn-danger btn-xs" onClick={() => openBlockModal(u)}><Ban size={12} />Заблок.</button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Начисление */}
      {tab === 'manual' && (
        <div style={{ maxWidth: 400 }}>
          <div className="section-title" style={{ marginBottom: 12 }}><Zap size={14} />Ручное начисление</div>
          <div className="detail-card">
            <form onSubmit={handleManual}>
              <div className="form-group" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">@Никнейм пользователя</label>
                  <input
                    className="form-input"
                    placeholder="@username"
                    value={usernameInput}
                    onChange={e => { setUsernameInput(e.target.value); setFoundUser(null); setLookupError(''); }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
                  />
                </div>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={handleLookup}>
                  <Search size={12} />Найти
                </button>
              </div>
              {lookupError && <div style={{ fontSize: 12, color: 'var(--rose)', marginBottom: 10 }}>{lookupError}</div>}
              {foundUser && (
                <div style={{ background: 'var(--indigo-l)', border: '0.5px solid #c7d2fe', borderRadius: 'var(--r)', padding: 10, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                    {foundUser.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{foundUser.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>@{foundUser.username} · {foundUser.balance} баллов</div>
                  </div>
                  <CheckCircle size={16} color="var(--emerald)" style={{ marginLeft: 'auto' }} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Операция</label>
                <select className="form-input" value={manualForm.type} onChange={e => setManualForm({ ...manualForm, type: e.target.value })}>
                  <option value="credit">Начислить</option>
                  <option value="debit">Списать</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Баллов <span className="form-required">*</span></label>
                <input
                  className={`form-input${manualErrors.amount ? ' input-error' : ''}`}
                  type="number"
                  min="1"
                  value={manualForm.amount}
                  onChange={e => { setManualForm({ ...manualForm, amount: e.target.value }); if (manualErrors.amount) setManualErrors(prev => ({ ...prev, amount: '' })); }}
                />
                <FieldError msg={manualErrors.amount} />
              </div>
              <div className="form-group">
                <label className="form-label">Причина <span className="form-required">*</span></label>
                <input
                  className={`form-input${manualErrors.description ? ' input-error' : ''}`}
                  placeholder="Бонус за квартал"
                  value={manualForm.description}
                  onChange={e => { setManualForm({ ...manualForm, description: e.target.value }); if (manualErrors.description) setManualErrors(prev => ({ ...prev, description: '' })); }}
                  maxLength={200}
                />
                <FieldError msg={manualErrors.description} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!foundUser}>
                <PlusCircle size={14} />
                {manualForm.type === 'credit' ? 'Начислить' : 'Списать'} {manualForm.amount || '...'} баллов
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Апелляции */}
      {tab === 'appeals' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span className="search-icon-pos"><Search size={14} /></span>
              <input className="search-input" placeholder="Поиск по имени, тексту апелляции..." value={appealSearch} onChange={e => setAppealSearch(e.target.value)} style={{ width: '100%' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>{filteredAppeals.length} апелляций</span>
          </div>
          {filteredAppeals.length === 0 ? (
            <div className="empty-state">Апелляций пока нет</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Email</th>
                    <th>Причина блокировки</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => { if (appealSort === 'appeal_at') setAppealDir(d => d === 'asc' ? 'desc' : 'asc'); else { setAppealSort('appeal_at'); setAppealDir('desc'); } }}>
                      Дата апелляции
                    </th>
                    <th>Статус</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppeals.map(u => (
                    <>
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>@{u.username}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{u.email}</td>
                        <td style={{ maxWidth: 200, fontSize: 13 }}>{u.block_reason || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                          {u.appeal_at ? new Date(u.appeal_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td>
                          {u.is_blocked ? (
                            <span style={{ fontSize: 12, color: 'var(--rose)' }}>Заблок.</span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--emerald)' }}>Разблок.</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-xs" onClick={() => setExpandedAppeal(expandedAppeal === u.id ? null : u.id)}>
                              {expandedAppeal === u.id ? 'Свернуть' : 'Читать'}
                            </button>
                            {u.is_blocked && (
                              <button className="btn btn-primary btn-xs" onClick={() => handleUnblock(u)}>Разблокировать</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedAppeal === u.id && (
                        <tr key={`${u.id}-appeal`}>
                          <td colSpan={6}>
                            <div style={{ padding: '10px 0', fontSize: 13, color: 'var(--text2)' }}>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Текст апелляции:</div>
                              {u.appeal_text}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Модалка блокировки */}
      {blockTarget && (
        <div className="modal-overlay" onClick={closeBlockModal}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Заблокировать пользователя</div>
            <div style={{ background: 'var(--indigo-l)', border: '0.5px solid #c7d2fe', borderRadius: 'var(--r)', padding: 10, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{blockTarget.name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{blockTarget.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>@{blockTarget.username} · {blockTarget.email}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Причина блокировки <span style={{ color: 'var(--rose)' }}>*</span></label>
              <textarea className="form-input" rows={4} value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Укажите причину блокировки..." maxLength={1000} autoFocus />
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>{blockReason.length} / 1000</div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={closeBlockModal}>Отмена</button>
              <button className="btn btn-danger" onClick={handleBlock} disabled={!blockReason.trim()}>
                <Ban size={14} />Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
