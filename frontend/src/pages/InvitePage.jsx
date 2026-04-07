import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const { token } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    if (!user) { navigate(`/login?redirect=/invite/${token}`); return; }

    api.post(`/projects/join/${token}`)
      .then(r => {
        toast.success(r.data.message);
        setStatus('success');
        setTimeout(() => navigate(`/projects/${r.data.project.id}`), 1500);
      })
      .catch(err => {
        toast.error(err.response?.data?.message || 'Ссылка недействительна');
        setStatus('error');
        setTimeout(() => navigate('/projects'), 2000);
      });
  }, [token, user]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      {status === 'loading' && <><div style={{ fontSize: 32 }}>🔗</div><p>Вступаем в проект...</p></>}
      {status === 'success' && <><div style={{ fontSize: 32 }}>✅</div><p>Вы вступили! Перенаправляем...</p></>}
      {status === 'error'   && <><div style={{ fontSize: 32 }}>❌</div><p>Ссылка недействительна. Перенаправляем...</p></>}
    </div>
  );
}
