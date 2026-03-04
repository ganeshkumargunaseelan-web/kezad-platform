'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, ShieldCheck, UserCog, User, UserCheck, MoreHorizontal } from 'lucide-react';
import {
  Card, CardContent, StatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, Badge, Modal, ModalFooter, Input, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SUPER_ADMIN: { label: 'Super Admin',  color: 'bg-red-100 text-red-700',    icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ADMIN:       { label: 'Admin',        color: 'bg-purple-100 text-purple-700', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  MANAGER:     { label: 'Manager',      color: 'bg-blue-100 text-blue-700',   icon: <UserCog className="h-3.5 w-3.5" /> },
  OPERATOR:    { label: 'Operator',     color: 'bg-green-100 text-green-700', icon: <UserCheck className="h-3.5 w-3.5" /> },
  CUSTOMER:    { label: 'Customer',     color: 'bg-gray-100 text-gray-700',   icon: <User className="h-3.5 w-3.5" /> },
};

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleModal, setRoleModal] = useState<{ id: string; currentRole: string; name: string } | null>(null);
  const [newRole, setNewRole] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: AppUser[] }>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['users'] }); setRoleModal(null); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/deactivate`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const users = data?.data ?? [];
  const filtered = users.filter((u) => {
    const matchRole = !roleFilter || u.role === roleFilter;
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    admins: users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length,
    managers: users.filter((u) => u.role === 'MANAGER').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">Manage employee portal users and access roles</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats.total} icon={<Users className="h-5 w-5" />} />
          <StatCard title="Active Users" value={stats.active} icon={<UserCheck className="h-5 w-5" />} variant="success" />
          <StatCard title="Admins" value={stats.admins} icon={<ShieldCheck className="h-5 w-5" />} />
          <StatCard title="Managers" value={stats.managers} icon={<UserCog className="h-5 w-5" />} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !filtered.length ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const meta = ROLE_META[u.role] ?? ROLE_META.OPERATOR;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{u.department ?? '—'}</TableCell>
                        <TableCell className="text-xs text-gray-400">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</TableCell>
                        <TableCell className="text-xs text-gray-400">{formatDate(u.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? 'success' : 'secondary'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setRoleModal({ id: u.id, currentRole: u.role, name: `${u.firstName} ${u.lastName}` }); setNewRole(u.role); }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            {u.isActive && u.role !== 'SUPER_ADMIN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                loading={deactivateMutation.isPending}
                                onClick={() => deactivateMutation.mutate(u.id)}
                              >
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Role Modal */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Change User Role" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Update role for <span className="font-semibold">{roleModal?.name}</span>
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">New Role</label>
            <select
              className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
            </select>
          </div>
          {newRole !== roleModal?.currentRole && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              This will change access permissions immediately.
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setRoleModal(null)}>Cancel</Button>
          <Button
            disabled={!newRole || newRole === roleModal?.currentRole}
            loading={roleMutation.isPending}
            onClick={() => roleModal && roleMutation.mutate({ id: roleModal.id, role: newRole })}
          >
            Update Role
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
