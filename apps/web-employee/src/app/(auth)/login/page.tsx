'use client';
// v2
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield } from 'lucide-react';
import { Button, Input } from '@kezad/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof LoginSchema>;

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'superadmin@kezad.ae', role: 'SUPER_ADMIN' },
  { label: 'Admin', email: 'admin@kezad.ae', role: 'ADMIN' },
  { label: 'Manager', email: 'manager@kezad.ae', role: 'MANAGER' },
  { label: 'Operator', email: 'operator@kezad.ae', role: 'OPERATOR' },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  function fillDemo(email: string) {
    setValue('email', email);
    setValue('password', 'Password123!');
    setError('');
  }

  async function onSubmit(data: LoginForm) {
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      const { user: raw, accessToken, refreshToken } = res.data.data as {
        user: { id: string; email: string; firstName: string; lastName: string; role: string };
        accessToken: string; refreshToken: string;
      };

      if (raw.role === 'CUSTOMER') {
        setError('This portal is for KEZAD staff only. Please use the customer portal.');
        return;
      }

      const user = { id: raw.id, email: raw.email, role: raw.role, name: `${raw.firstName} ${raw.lastName}`.trim() };
      setAuth(user, accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Invalid credentials');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(220 70% 20%) 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">KEZAD Operations</h1>
          <p className="text-sm text-white/60 mt-1">Employee Portal — Authorised Access Only</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Demo accounts */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => fillDemo(a.email)}
                  className="flex flex-col px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">{a.label}</span>
                  <span className="text-xs text-slate-400 truncate">{a.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or enter manually</span></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Work Email</label>
              <Input type="email" placeholder="name@kezad.ae" autoComplete="email" error={errors.email?.message} {...register('email')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input type="password" placeholder="••••••••" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <Button type="submit" className="w-full" loading={isSubmitting}>Sign In</Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          © {new Date().getFullYear()} KEZAD Utilities & Facilities Management. Restricted access.
        </p>
      </div>
    </div>
  );
}
