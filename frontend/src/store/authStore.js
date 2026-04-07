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

  register: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/register', formData);
      localStorage.setItem('al_token', data.token);
      set({ user: data.user, token: data.token, loading: false });
      return data;
    } catch (e) {
      set({ loading: false });
      throw e;
    }
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
