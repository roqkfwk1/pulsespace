import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  refreshToken: (() => {
    const v = localStorage.getItem('refreshToken');
    return v && v !== 'undefined' ? v : null;
  })(),
  user: (() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  })(),
  setAuth: (token, refreshToken, user) => {
    localStorage.setItem('token', token);
    if (refreshToken && refreshToken !== 'undefined') {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, refreshToken: (refreshToken && refreshToken !== 'undefined') ? refreshToken : null, user });
  },
  setAccessToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ token: null, refreshToken: null, user: null });
  },
  isAuthenticated: () => !!get().token,
}));
