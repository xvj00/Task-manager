import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, LogIn, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="field-error">
      <AlertCircle size={11} />{msg}
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const upd = f => e => {
    setForm(prev => ({ ...prev, [f]: e.target.value }));
    if (errors[f]) setErrors(prev => ({ ...prev, [f]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = 'Введите email';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      errs.email = 'Некорректный формат email';
    }
    if (!form.password) {
      errs.password = 'Введите пароль';
    } else if (form.password.length < 6) {
      errs.password = 'Минимум 6 символов';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    try {
      await login(form.email.trim(), form.password);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Неверный email или пароль';
      setErrors({ password: msg });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrap">
        <div className="auth-logo-block">
          <div className="auth-logo-icon">
            <Trophy size={22} color="#fff" />
          </div>
          <div className="auth-app-name">Artem List</div>
          <div className="auth-app-sub">Войдите в систему</div>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className={`form-input${errors.email ? ' input-error' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={upd('email')}
                autoComplete="email"
              />
              <FieldError msg={errors.email} />
            </div>
            <div className="form-group">
              <label className="form-label">Пароль</label>
              <input
                type="password"
                className={`form-input${errors.password ? ' input-error' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={upd('password')}
                autoComplete="current-password"
              />
              <FieldError msg={errors.password} />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14, marginTop: 4 }}
              disabled={loading}
            >
              <LogIn size={14} />
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          <div className="auth-link">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
