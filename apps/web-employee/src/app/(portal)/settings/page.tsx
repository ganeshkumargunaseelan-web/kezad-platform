'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Shield, Bell, Globe, Lock, User, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@kezad/ui';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

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

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account preferences and security</p>
      </div>

      <div className="p-8 max-w-2xl space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" /> Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-primary">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <div className="mt-1">
                  <Badge variant="secondary">{user?.role?.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-400" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Current Password</label>
              <Input type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">New Password</label>
              <Input type="password" placeholder="Min. 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Confirm New Password</label>
              <Input type="password" placeholder="Repeat new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {pwError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{pwError}</div>
            )}
            {pwSuccess && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Password changed successfully.</div>
            )}
            <Button
              disabled={!currentPassword || !newPassword || !confirmPassword}
              loading={changePwMutation.isPending}
              onClick={handleChangePw}
            >
              <Save className="h-4 w-4 mr-2" /> Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-400" /> Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-5 space-y-3">
            {[
              { label: 'Workflow approvals requiring my action', defaultOn: true },
              { label: 'Invoice generated notifications', defaultOn: true },
              { label: 'Contract status changes', defaultOn: true },
              { label: 'System maintenance alerts', defaultOn: false },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700">{pref.label}</span>
                <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pref.defaultOn ? 'bg-primary' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${pref.defaultOn ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-2">Notification preferences are managed by your administrator.</p>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-400" /> System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Platform</span><span className="font-medium">KEZAD Utilities Management v2.0</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Environment</span><span className="font-medium">Production</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Region</span><span className="font-medium">UAE — Abu Dhabi</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Compliance</span><span className="font-medium">IFRS 9 · UAE VAT · ADDC Standards</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Session Timeout</span><span className="font-medium">15 minutes (JWT)</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="font-medium">{user?.role}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">2FA</span><span className="font-medium text-amber-600">Not enabled</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
