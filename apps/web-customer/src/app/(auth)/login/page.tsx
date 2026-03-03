'use client';
// v2
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap } from 'lucide-react';
import { Button } from '@kezad/ui';
import { Input } from '@kezad/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof LoginSchema>;

const DEMO_ACCOUNTS = [
  { label: 'Global Steel', email: 'procurement@globalsteel.ae' },
  { label: 'Petrochemical Abu', email: 'utilities@petrochemicalabu.ae' },
  { label: 'Al Hamra Mfg', email: 'facilities@AlHamraMfg.ae' },
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
      const res = await api.post('/auth/customer/login', data);
      const { user: raw, accessToken, refreshToken } = res.data.data as {
        user: { id: string; email: string; firstName: string; lastName: string; role: string; customerId?: string | null };
        accessToken: string;
        refreshToken: string;
      };
      const user = { id: raw.id, email: raw.email, role: raw.role, name: `${raw.firstName} ${raw.lastName}`.trim(), customerId: raw.customerId };
      setAuth(user, accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Invalid email or password';
      setError(message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-lg mb-4">
            <Zap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KEZAD Customer Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage your utility services</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Demo accounts */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Demo Login</p>
            <div className="flex flex-col gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => fillDemo(a.email)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-blue-800">{a.label}</span>
                  <span className="text-xs text-blue-500 truncate ml-2">{a.email}</span>
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
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <Input
                type="email"
                placeholder="name@company.ae"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">
              New investor?{' '}
              <a href="/register" className="text-primary font-medium hover:underline">
                Register your company
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} KEZAD Utilities & Facilities Management. All rights reserved.
        </p>
      </div>
    </div>
  );
}
