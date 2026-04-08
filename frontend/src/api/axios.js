import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8001/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('al_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Для FormData убираем JSON Content-Type — браузер сам поставит multipart с boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('al_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
