import axios, { type AxiosError } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// Simple client-side request ID generator for log correlation (no crypto dep needed)
function newRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('emp_accessToken') : null;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  // Attach a client-generated request ID so server logs can be correlated to browser DevTools
  config.headers['X-Request-ID'] = newRequestId();
  return config;
});

let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const req = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !req._retry) {
      req._retry = true;
      if (refreshing) return new Promise((res) => { queue.push((t) => { req.headers!['Authorization'] = `Bearer ${t}`; res(api(req)); }); });
      refreshing = true;
      try {
        const rt = localStorage.getItem('emp_refreshToken');
        if (!rt) throw new Error('no refresh');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: rt });
        const { accessToken } = data.data as { accessToken: string };
        localStorage.setItem('emp_accessToken', accessToken);
        queue.forEach((cb) => cb(accessToken));
        queue = [];
        req.headers!['Authorization'] = `Bearer ${accessToken}`;
        return api(req);
      } catch {
        localStorage.removeItem('emp_accessToken');
        localStorage.removeItem('emp_refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      } finally { refreshing = false; }
    }
    return Promise.reject(error);
  },
);
