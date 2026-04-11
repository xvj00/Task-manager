import { useEffect, useState } from 'react';
import { Gift, Plus, Coins, Clock, CheckCircle, X, Inbox, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error"><AlertCircle size={11} />{msg}</div>;
}

export default function PrizesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [prizes, setPrizes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', cost_points: '', quantity: -1 });
  const [formErrors, setFormErrors] = useState({});

  const load = () => {
    api.get('/prizes').then(r => setPrizes(r.data)).catch(() => {});
    if (isAdmin) api.get('/prize-requests').then(r => setRequests(r.data)).catch(() => {});
    else api.get('/prize-requests/my').then(r => setRequests(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [user]);

  const handleRequest = async (prizeId) => {
    try { await api.post(`/prizes/${prizeId}/request`); toast.success('Запрос отправлен!'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const validatePrize = () => {
    const errs = {};
    if (!form.name.trim()) {
      errs.name = 'Введите название';
    } else if (form.name.trim().length > 100) {
      errs.name = 'Максимум 100 символов';
    }
    const pts = Number(form.cost_points);
    if (!form.cost_points && form.cost_points !== 0) {
      errs.cost_points = 'Укажите стоимость';
    } else if (!Number.isInteger(pts) || pts < 1) {
      errs.cost_points = 'Целое число ≥ 1';
    }
    const qty = Number(form.quantity);
    if (!Number.isInteger(qty) || qty < -1) {
      errs.quantity = 'Целое число ≥ -1 (−1 = без лимита)';
    }
    return errs;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = validatePrize();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setFormErrors({});
    try {
      await api.post('/prizes', { ...form, name: form.name.trim(), cost_points: Number(form.cost_points), quantity: Number(form.quantity) });
      toast.success('Приз добавлен');
      setShowForm(false);
      setForm({ name: '', description: '', cost_points: '', quantity: -1 });
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const handleHandle = async (reqId, action) => {
    try { await api.post(`/prize-requests/${reqId}/handle`, { action }); toast.success(action === 'approve' ? 'Одобрено' : 'Отклонено'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const upd = f => e => {
    setForm(prev => ({ ...prev, [f]: e.target.value }));
    if (formErrors[f]) setFormErrors(prev => ({ ...prev, [f]: '' }));
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><Gift size={18} />Витрина наград</div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} />Добавить приз
          </button>
        )}
      </div>

      {showForm && (
        <div className="detail-card" style={{ maxWidth: 480, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Новый приз</div>
          <form onSubmit={handleCreate} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Название <span className="form-required">*</span></label>
                <input
                  className={`form-input${formErrors.name ? ' input-error' : ''}`}
                  type="text"
                  value={form.name}
                  onChange={upd('name')}
                  placeholder="Название приза"
                  maxLength={100}
                />
                <FieldError msg={formErrors.name} />
              </div>
              <div className="form-group">
                <label className="form-label">Стоимость (баллов) <span className="form-required">*</span></label>
                <input
                  className={`form-input${formErrors.cost_points ? ' input-error' : ''}`}
                  type="number"
                  min="1"
                  value={form.cost_points}
                  onChange={upd('cost_points')}
                  placeholder="100"
                />
                <FieldError msg={formErrors.cost_points} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Описание</label>
              <textarea className="form-input" value={form.description} onChange={upd('description')} rows={2} placeholder="Описание приза..." maxLength={500} />
            </div>
            <div className="form-group">
              <label className="form-label">Количество (-1 = неограничено)</label>
              <input
                className={`form-input${formErrors.quantity ? ' input-error' : ''}`}
                type="number"
                min="-1"
                value={form.quantity}
                onChange={upd('quantity')}
              />
              <FieldError msg={formErrors.quantity} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setFormErrors({}); }}>Отмена</button>
              <button type="submit" className="btn btn-primary">Создать</button>
            </div>
          </form>
        </div>
      )}

      <div className="prizes-grid">
        {prizes.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Призов пока нет</div>
        )}
        {prizes.map(p => (
          <div key={p.id} className="prize-card">
            <div className="prize-icon-wrap"><Gift size={22} /></div>
            <div className="prize-name">{p.name}</div>
            {p.description && <div className="prize-desc">{p.description}</div>}
            <div className="prize-price"><Coins size={14} />{p.cost_points} баллов</div>
            <div className="prize-stock">{p.quantity === -1 ? 'Без ограничений' : `Осталось: ${p.quantity}`}</div>
            {!isAdmin && (
              <button
                className={`btn ${user?.balance >= p.cost_points ? 'btn-primary' : 'btn-ghost'}`}
                style={{ width: '100%', justifyContent: 'center', fontSize: 12, opacity: user?.balance < p.cost_points ? 0.5 : 1 }}
                onClick={() => handleRequest(p.id)}
                disabled={user?.balance < p.cost_points}
              >
                {user?.balance < p.cost_points ? 'Недостаточно баллов' : 'Запросить'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="divider" />

      <div className="section-title" style={{ marginBottom: 12 }}>
        <Inbox size={14} />{isAdmin ? 'Запросы на призы' : 'Мои запросы'}
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">Запросов нет</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Приз</th>
                {isAdmin && <th>Пользователь</th>}
                <th>Статус</th>
                <th>Дата</th>
                <th>Баллы</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.prize?.name}</td>
                  {isAdmin && <td style={{ fontSize: 12 }}>{r.user?.name}</td>}
                  <td>
                    {r.status === 'pending' && (
                      <span style={{ fontSize: 12, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />Ожидает
                      </span>
                    )}
                    {r.status === 'approved' && (
                      <span style={{ fontSize: 12, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} />Одобрено
                      </span>
                    )}
                    {r.status === 'rejected' && (
                      <span style={{ fontSize: 12, color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={12} />Отклонено
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(r.created_at).toLocaleDateString('ru-RU')}</td>
                  <td style={{ fontSize: 12, fontWeight: 500 }}>{r.prize?.cost_points}</td>
                  {isAdmin && (
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary btn-xs" onClick={() => handleHandle(r.id, 'approve')}>Одобрить</button>
                          <button className="btn btn-danger btn-xs" onClick={() => handleHandle(r.id, 'reject')}>Отклонить</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
