import { useState } from 'react';
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
    if (text.trim().length < 20) {
      toast.error('Апелляция слишком короткая (минимум 20 символов)');
      return;
    }
    setLoading(true);
    try {
      await api.post('/appeal', { text: text.trim() });
      toast.success('Апелляция подана. Ожидайте решения администратора.');
      setSubmitted(true);
      // Обновляем данные пользователя
      await fetchMe();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка при подаче апелляции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blocked-screen">
      <div className="blocked-card">
        <div className="blocked-icon">🚫</div>
        <h1 className="blocked-title">Ваш аккаунт заблокирован</h1>

        <div className="blocked-reason-box">
          <div className="blocked-reason-label">Причина блокировки:</div>
          <div className="blocked-reason-text">{reason || 'Причина не указана'}</div>
        </div>

        {submitted ? (
          <div className="appeal-submitted-notice">
            <span className="appeal-submitted-icon">✅</span>
            <div>
              <strong>Апелляция подана</strong>
              <p>Ваше обращение передано администратору. Ожидайте решения. Повторная подача апелляции невозможна.</p>
            </div>
          </div>
        ) : (
          <div className="appeal-section">
            <div className="appeal-warning">
              <strong>⚠️ Внимание — апелляцию можно подать только один раз.</strong>
              <p>
                Это ваш единственный шанс донести свою позицию до администратора.
                Изложите ситуацию максимально подробно и честно: почему вы считаете блокировку
                ошибочной или несправедливой, что произошло на самом деле, и почему вам следует
                восстановить доступ. Поверхностные, неискренние или пустые апелляции
                отклоняются без рассмотрения. Отнеситесь к этому серьёзно — второго шанса не будет.
              </p>
            </div>
            <form onSubmit={handleAppeal} className="appeal-form">
              <label className="appeal-label">Текст апелляции *</label>
              <textarea
                className="appeal-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={7}
                placeholder="Опишите ситуацию подробно и честно..."
                maxLength={3000}
                required
              />
              <div className="appeal-char-count">{text.length} / 3000</div>
              <button
                type="submit"
                className="btn btn-primary appeal-submit-btn"
                disabled={loading || text.trim().length < 20}
              >
                {loading ? 'Отправка...' : 'Подать апелляцию'}
              </button>
            </form>
          </div>
        )}

        <button className="btn btn-secondary blocked-logout-btn" onClick={logout}>
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
