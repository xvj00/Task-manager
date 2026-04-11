import { useState } from 'react';
import { Trophy, Ban, CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function BlockedPage({ reason, appealSubmitted: initialSubmitted }) {
  const { logout, fetchMe } = useAuthStore();
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAppeal = async (e) => {
    e.preventDefault();
    if (text.trim().length < 20) { toast.error('Апелляция слишком короткая (минимум 20 символов)'); return; }
    setLoading(true);
    try {
      await api.post('/appeal', { text: text.trim() });
      toast.success('Апелляция подана. Ожидайте решения администратора.');
      setSubmitted(true);
      await fetchMe();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка при подаче апелляции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrap" style={{ maxWidth: 480 }}>
        <div className="auth-logo-block">
          <div className="auth-logo-icon">
            <Trophy size={22} color="#fff" />
          </div>
          <div className="auth-app-name">Artem List</div>
        </div>

        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <Ban size={40} color="var(--rose)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text1)', marginBottom: 8 }}>Ваш аккаунт заблокирован</div>
          </div>

          <div style={{ background: '#fff1f2', border: '0.5px solid #fecdd3', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Причина блокировки</div>
            <div style={{ fontSize: 13, color: 'var(--rose)' }}>{reason || 'Причина не указана'}</div>
          </div>

          {submitted ? (
            <div style={{ background: '#ecfdf5', border: '0.5px solid #a7f3d0', borderRadius: 'var(--r)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
              <CheckCircle size={18} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)', marginBottom: 4 }}>Апелляция подана</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Ваше обращение передано администратору. Ожидайте решения. Повторная подача апелляции невозможна.</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertTriangle size={15} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: '#92400e' }}>
                  <strong>Апелляцию можно подать только один раз.</strong> Изложите ситуацию подробно и честно.
                </div>
              </div>
              <form onSubmit={handleAppeal}>
                <div className="form-group">
                  <label className="form-label">Текст апелляции <span style={{ color: 'var(--rose)' }}>*</span></label>
                  <textarea
                    className="form-input"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={6}
                    placeholder="Опишите ситуацию подробно и честно..."
                    maxLength={3000}
                    required
                    style={{ minHeight: 120 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right', marginTop: 2 }}>{text.length} / 3000</div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                  disabled={loading || text.trim().length < 20}
                >
                  {loading ? 'Отправка...' : 'Подать апелляцию'}
                </button>
              </form>
            </div>
          )}

          <button className="logout-btn" onClick={logout}>
            <LogOut size={13} />Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
