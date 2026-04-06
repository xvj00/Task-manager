import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) { toast.error('Пароли не совпадают'); return; }
    try {
      await register(form.name, form.email, form.password, form.password_confirmation);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка регистрации');
    }
  };

  const upd = f => e => setForm({...form, [f]: e.target.value});

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏆</div>
          <span className="auth-title">Artem List</span>
        </div>
        <h2>Регистрация</h2>
        <p className="auth-subtitle">Создайте аккаунт исполнителя</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group"><label>Имя</label><input type="text" value={form.name} onChange={upd('name')} required placeholder="Ваше имя" /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={upd('email')} required placeholder="you@example.com" /></div>
          <div className="form-group"><label>Пароль</label><input type="password" value={form.password} onChange={upd('password')} required placeholder="Минимум 6 символов" /></div>
          <div className="form-group"><label>Подтвердите пароль</label><input type="password" value={form.password_confirmation} onChange={upd('password_confirmation')} required placeholder="Повторите пароль" /></div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Создание...' : 'Зарегистрироваться'}</button>
        </form>
        <p className="auth-link">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </div>
    </div>
  );
}
