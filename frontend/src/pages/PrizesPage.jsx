import { useEffect, useState } from 'react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function PrizesPage() {
  const { user } = useAuthStore();
  const [prizes, setPrizes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', cost_points: '', quantity: -1 });

  const load = () => {
    api.get('/prizes').then(r => setPrizes(r.data));
    if (user?.role === 'creator') api.get('/prize-requests').then(r => setRequests(r.data));
    else api.get('/prize-requests/my').then(r => setRequests(r.data));
  };

  useEffect(() => { load(); }, [user]);

  const handleRequest = async (prizeId) => {
    try { await api.post(`/prizes/${prizeId}/request`); toast.success('Запрос отправлен!'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await api.post('/prizes', form); toast.success('Приз добавлен'); setShowForm(false); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const handleHandle = async (reqId, action) => {
    try { await api.post(`/prize-requests/${reqId}/handle`, { action }); toast.success(action === 'approve' ? 'Одобрено' : 'Отклонено'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Ошибка'); }
  };

  const upd = f => e => setForm({...form, [f]: e.target.value});

  return (
    <div className="page">
      <div className="page-header">
        <h1>🎁 Витрина наград</h1>
        {user?.role === 'creator' && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Добавить приз</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="form-card" style={{marginBottom: 24}}>
          <h3>Новый приз</h3>
          <div className="form-row">
            <div className="form-group"><label>Название *</label><input type="text" value={form.name} onChange={upd('name')} required /></div>
            <div className="form-group"><label>Стоимость (баллов) *</label><input type="number" min="1" value={form.cost_points} onChange={upd('cost_points')} required /></div>
          </div>
          <div className="form-group"><label>Описание</label><textarea value={form.description} onChange={upd('description')} rows={2} /></div>
          <div className="form-group"><label>Количество (-1 = неограничено)</label><input type="number" min="-1" value={form.quantity} onChange={upd('quantity')} /></div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
            <button type="submit" className="btn btn-primary">Создать</button>
          </div>
        </form>
      )}

      <div className="prizes-grid">
        {prizes.length === 0 && <p className="empty-state-big">🎁 Призов пока нет</p>}
        {prizes.map(p => (
          <div key={p.id} className="prize-card">
            <div className="prize-icon">🎁</div>
            <div className="prize-name">{p.name}</div>
            {p.description && <div className="prize-desc">{p.description}</div>}
            <div className="prize-cost">💰 {p.cost_points} баллов</div>
            {p.quantity >= 0 && <div className="prize-qty">Осталось: {p.quantity}</div>}
            {user?.role === 'executor' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleRequest(p.id)}
                disabled={user.balance < p.cost_points}
              >
                {user.balance < p.cost_points ? 'Недостаточно баллов' : 'Запросить'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Запросы */}
      {requests.length > 0 && (
        <div style={{marginTop: 32}}>
          <h2>{user?.role === 'creator' ? 'Запросы на призы' : 'Мои запросы'}</h2>
          <div className="requests-list">
            {requests.map(r => (
              <div key={r.id} className={`request-row status-${r.status}`}>
                <div className="request-info">
                  <strong>{r.prize?.name}</strong>
                  {user?.role === 'creator' && <span> — {r.user?.name}</span>}
                  <span className={`req-status ${r.status}`}>
                    {r.status === 'pending' ? '⏳ Ожидает' : r.status === 'approved' ? '✅ Одобрено' : '❌ Отклонено'}
                  </span>
                </div>
                <div className="request-meta">💰 {r.prize?.cost_points} баллов · {new Date(r.created_at).toLocaleDateString('ru-RU')}</div>
                {user?.role === 'creator' && r.status === 'pending' && (
                  <div className="request-actions">
                    <button className="btn btn-success btn-xs" onClick={() => handleHandle(r.id, 'approve')}>Одобрить</button>
                    <button className="btn btn-danger btn-xs" onClick={() => handleHandle(r.id, 'reject')}>Отклонить</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
