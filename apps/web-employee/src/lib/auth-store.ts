import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User { id: string; email: string; name: string; role: string; }
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  hasRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, accessToken: null, refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken });
        localStorage.setItem('emp_accessToken', accessToken);
        localStorage.setItem('emp_refreshToken', refreshToken);
      },
      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        localStorage.removeItem('emp_accessToken');
        localStorage.removeItem('emp_refreshToken');
      },
      isAuthenticated: () => !!get().accessToken && !!get().user,
      hasRole: (roles) => roles.includes(get().user?.role ?? ''),
    }),
    { name: 'kezad-employee-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) },
  ),
);
