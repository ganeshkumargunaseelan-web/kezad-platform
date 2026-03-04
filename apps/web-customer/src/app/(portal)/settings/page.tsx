'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  User, Lock, Bell, Shield, Globe, Save, Eye, EyeOff,
  CheckCircle2, Mail, Calendar, Building2, KeyRound,
} from 'lucide-react';
import { Card, CardContent, Button, Input, Badge } from '@kezad/ui';
import { useAuthStore } from '@/lib/auth-store';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    invoices: true,
    reminders: true,
    overdue: true,
    contracts: true,
    serviceRequests: false,
  });

  const changePwMutation = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword, newPassword }),
    onSuccess: () => {
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to change password';
      setPwError(msg);
    },
  });

  function handleChangePw() {
    setPwError('');
    setPwSuccess(false);
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    changePwMutation.mutate();
  }

  const passwordStrength = (() => {
    if (!newPassword) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
    if (score <= 2) return { label: 'Weak', color: 'bg-red-400', width: '33%' };
    if (score <= 3) return { label: 'Fair', color: 'bg-amber-400', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-400', width: '100%' };
  })();

  const toggleNotif = (key: keyof typeof notifPrefs) =>
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));

  const notifItems: { key: keyof typeof notifPrefs; label: string; desc: string }[] = [
    { key: 'invoices', label: 'Invoice Notifications', desc: 'Receive alerts when new invoices are generated' },
    { key: 'reminders', label: 'Payment Reminders', desc: 'Get notified 7 days before invoices are due' },
    { key: 'overdue', label: 'Overdue Alerts', desc: 'Immediate notification when an invoice becomes overdue' },
    { key: 'contracts', label: 'Contract Updates', desc: 'Renewal reminders and contract status changes' },
    { key: 'serviceRequests', label: 'Service Request Updates', desc: 'Status changes on your submitted requests' },
  ];

  return (
    <div className="animate-fade-in">
      <Header title="Settings" subtitle="Manage your account preferences and security" />

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
          {/* Left column — Profile & Security */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Profile */}
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> Account Profile
                  </h3>
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}>
                      <span className="text-2xl font-bold text-white">{user?.name?.[0]?.toUpperCase() ?? 'C'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center gap-2.5 text-sm">
                          <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600 truncate">{user?.email}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm">
                          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600">Customer Account</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm">
                          <KeyRound className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600 capitalize">{user?.role?.toLowerCase()?.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600">Member since 2025</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" /> Security
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Update your password to keep your account secure</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Current Password</label>
                    <div className="relative">
                      <Input
                        type={showCurrent ? 'text' : 'password'}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">New Password</label>
                      <div className="relative">
                        <Input
                          type={showNew ? 'text' : 'password'}
                          placeholder="Minimum 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {newPassword && (
                        <div className="mt-2">
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Strength: <span className="font-medium">{passwordStrength.label}</span></p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Confirm New Password</label>
                      <Input
                        type="password"
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      {confirmPassword && newPassword === confirmPassword && (
                        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Passwords match
                        </p>
                      )}
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-2">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                  {pwError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{pwError}</div>
                  )}
                  {pwSuccess && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Password changed successfully
                    </div>
                  )}
                  <div className="pt-2">
                    <Button
                      disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      loading={changePwMutation.isPending}
                      onClick={handleChangePw}
                    >
                      <Save className="h-4 w-4 mr-2" /> Update Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column — Notifications & Info */}
          <div className="space-y-6">
            {/* Notification Preferences */}
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" /> Notifications
                  </h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {notifItems.map((item) => (
                    <div key={item.key} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => toggleNotif(item.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                          notifPrefs[item.key] ? 'bg-primary' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          notifPrefs[item.key] ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Platform Info */}
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Platform
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {[
                    { label: 'Portal', value: 'KEZAD Customer Portal v2.0' },
                    { label: 'Currency', value: 'AED (UAE Dirham)' },
                    { label: 'VAT Rate', value: '5% (UAE Standard)' },
                    { label: 'Support', value: 'support@kezad.ae' },
                    { label: 'Region', value: 'Abu Dhabi, UAE' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="font-medium text-gray-800">{row.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Privacy & Compliance
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Your data is processed in compliance with UAE data protection regulations.
                    Billing data is retained for 7 years per IFRS requirements.
                  </p>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-gray-500">All systems operational</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
