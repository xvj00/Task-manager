import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link2, CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const { token } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="detail-card" style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
        {status === 'loading' && (
          <>
            <Loader size={40} color="var(--indigo)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text1)', marginBottom: 4 }}>Вступаем в проект...</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Пожалуйста, подождите</div>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={40} color="var(--emerald)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text1)', marginBottom: 4 }}>Вы вступили в проект!</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Перенаправляем...</div>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} color="var(--rose)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text1)', marginBottom: 4 }}>Ссылка недействительна</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Перенаправляем на проекты...</div>
          </>
        )}
      </div>
    </div>
  );
}
