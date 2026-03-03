'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@kezad/ui';
import { Input } from '@kezad/ui';
import { api } from '@/lib/api';

const RegisterSchema = z.object({
  companyName: z.string().min(2, 'Company name required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  vatRegistrationNo: z.string().optional(),
});

const VerifySchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof RegisterSchema>;
type VerifyForm = z.infer<typeof VerifySchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'register' | 'verify' | 'success'>('register');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(RegisterSchema) });
  const verifyForm = useForm<VerifyForm>({ resolver: zodResolver(VerifySchema) });

  async function onRegister(data: RegisterForm) {
    setError('');
    try {
      await api.post('/auth/customer/register', data);
      setEmail(data.email);
      setStep('verify');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Registration failed');
    }
  }

  async function onVerify(data: VerifyForm) {
    setError('');
    try {
      await api.post('/auth/customer/verify-otp', { email, otp: data.otp, password: data.password });
      setStep('success');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Verification failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-lg mb-4">
            <Zap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Investor Registration</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'register' ? 'Create your KEZAD customer account' :
             step === 'verify' ? `Enter the OTP sent to ${email}` :
             'Registration complete!'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {step === 'success' ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold">Account Created</h2>
              <p className="text-sm text-gray-500 mt-1">Redirecting to login...</p>
            </div>
          ) : step === 'register' ? (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <Input placeholder="ACME Industries LLC" error={registerForm.formState.errors.companyName?.message} {...registerForm.register('companyName')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <Input type="email" placeholder="admin@acme.ae" error={registerForm.formState.errors.email?.message} {...registerForm.register('email')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                <Input type="tel" placeholder="+971 50 000 0000" error={registerForm.formState.errors.phone?.message} {...registerForm.register('phone')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">VAT Registration No. <span className="text-gray-400">(optional)</span></label>
                <Input placeholder="100123456700003" {...registerForm.register('vatRegistrationNo')} />
              </div>
              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
              <Button type="submit" className="w-full" loading={registerForm.formState.isSubmitting}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-5">
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                An OTP has been sent to <strong>{email}</strong>. Please check your inbox.
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">OTP Code</label>
                <Input placeholder="123456" maxLength={6} error={verifyForm.formState.errors.otp?.message} {...verifyForm.register('otp')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Create Password</label>
                <Input type="password" placeholder="Min. 8 characters" error={verifyForm.formState.errors.password?.message} {...verifyForm.register('password')} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                <Input type="password" placeholder="Repeat password" error={verifyForm.formState.errors.confirmPassword?.message} {...verifyForm.register('confirmPassword')} />
              </div>
              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
              <Button type="submit" className="w-full" loading={verifyForm.formState.isSubmitting}>
                Activate Account
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-primary font-medium hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
