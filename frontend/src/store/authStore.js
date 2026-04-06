import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('al_token') || null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    const { data } = await api.post('/login', { email, password });
    localStorage.setItem('al_token', data.token);
    set({ user: data.user, token: data.token, loading: false });
    return data;
  },

  register: async (name, email, password, password_confirmation) => {
    set({ loading: true });
    const { data } = await api.post('/register', { name, email, password, password_confirmation });
    localStorage.setItem('al_token', data.token);
    set({ user: data.user, token: data.token, loading: false });
    return data;
  },

  logout: async () => {
    try { await api.post('/logout'); } catch (_) {}
    localStorage.removeItem('al_token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    const { data } = await api.get('/me');
    set({ user: data });
    return data;
  },
}));

export default useAuthStore;
