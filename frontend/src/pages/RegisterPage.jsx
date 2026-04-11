import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="field-error">
      <AlertCircle size={11} />{msg}
    </div>
  );
}

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  const upd = f => e => {
    setForm(prev => ({ ...prev, [f]: e.target.value }));
    if (errors[f]) setErrors(prev => ({ ...prev, [f]: '' }));
  };

  const validate = () => {
    const errs = {};
    const name = form.name.trim();
    if (!name) {
      errs.name = 'Введите имя';
    } else if (name.length < 2) {
      errs.name = 'Минимум 2 символа';
    } else if (name.length > 100) {
      errs.name = 'Максимум 100 символов';
    }

    const username = form.username.trim();
    if (!username) {
      errs.username = 'Введите никнейм';
    } else if (username.length < 2) {
      errs.username = 'Минимум 2 символа';
    } else if (username.length > 30) {
      errs.username = 'Максимум 30 символов';
    } else if (!USERNAME_RE.test(username)) {
      errs.username = 'Только буквы, цифры и _';
    }

    if (!form.email.trim()) {
      errs.email = 'Введите email';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      errs.email = 'Некорректный формат email';
    }

    if (!form.password) {
      errs.password = 'Введите пароль';
    } else if (form.password.length < 6) {
      errs.password = 'Минимум 6 символов';
    } else if (form.password.length > 100) {
      errs.password = 'Максимум 100 символов';
    }

    if (!form.password_confirmation) {
      errs.password_confirmation = 'Подтвердите пароль';
    } else if (form.password !== form.password_confirmation) {
      errs.password_confirmation = 'Пароли не совпадают';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    try {
      await register({ ...form, name: form.name.trim(), username: form.username.trim(), email: form.email.trim() });
      navigate('/');
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        const mapped = {};
        Object.entries(serverErrors).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      } else {
        toast.error(err.response?.data?.message || 'Ошибка регистрации');
      }
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
          <div className="auth-app-sub">Создайте аккаунт</div>
        </div>

        <div className="auth-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Имя <span className="form-required">*</span></label>
              <input
                type="text"
                className={`form-input${errors.name ? ' input-error' : ''}`}
                value={form.name}
                onChange={upd('name')}
                placeholder="Ваше имя"
                maxLength={100}
                autoComplete="name"
              />
              <FieldError msg={errors.name} />
            </div>
            <div className="form-group">
              <label className="form-label">Никнейм <span className="form-required">*</span></label>
              <input
                type="text"
                className={`form-input${errors.username ? ' input-error' : ''}`}
                value={form.username}
                onChange={upd('username')}
                placeholder="только буквы, цифры, _"
                maxLength={30}
                autoComplete="username"
              />
              <FieldError msg={errors.username} />
            </div>
            <div className="form-group">
              <label className="form-label">Email <span className="form-required">*</span></label>
              <input
                type="email"
                className={`form-input${errors.email ? ' input-error' : ''}`}
                value={form.email}
                onChange={upd('email')}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <FieldError msg={errors.email} />
            </div>
            <div className="form-group">
              <label className="form-label">Пароль <span className="form-required">*</span></label>
              <input
                type="password"
                className={`form-input${errors.password ? ' input-error' : ''}`}
                value={form.password}
                onChange={upd('password')}
                placeholder="Минимум 6 символов"
                maxLength={100}
                autoComplete="new-password"
              />
              <FieldError msg={errors.password} />
            </div>
            <div className="form-group">
              <label className="form-label">Подтвердите пароль <span className="form-required">*</span></label>
              <input
                type="password"
                className={`form-input${errors.password_confirmation ? ' input-error' : ''}`}
                value={form.password_confirmation}
                onChange={upd('password_confirmation')}
                placeholder="Повторите пароль"
                maxLength={100}
                autoComplete="new-password"
              />
              <FieldError msg={errors.password_confirmation} />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14, marginTop: 4 }}
              disabled={loading}
            >
              <UserPlus size={14} />
              {loading ? 'Создание...' : 'Зарегистрироваться'}
            </button>
          </form>
          <div className="auth-link">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
