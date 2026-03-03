'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, RefreshCw, Building2, Users, CheckCircle2, XCircle } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, statusVariant,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, StatCard, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface CustomerContact {
  email: string;
  phone: string;
  isPrimary: boolean;
}

interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  isActive: boolean;
  createdAt: string;
  contacts: CustomerContact[];
  _count?: { contracts: number };
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Customer[] }>({
    queryKey: ['customers', search],
    queryFn: () => api.get(`/customers?search=${encodeURIComponent(search)}`).then((r) => r.data),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.post(`/customers/${id}/crm-sync`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const customers = data?.data ?? [];

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">Manage industrial investors and CRM sync</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard title="Total Customers" value={customers.length} icon={<Users className="h-5 w-5" />} />
          <StatCard title="Active" value={customers.filter((c) => c.isActive).length} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
          <StatCard title="Inactive" value={customers.filter((c) => !c.isActive).length} icon={<XCircle className="h-5 w-5" />} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full max-w-md pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            placeholder="Search by company name, email, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Directory ({customers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !customers.length ? (
              <div className="text-center py-16">
                <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No customers found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Code</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-medium">{c.customerCode}</TableCell>
                      <TableCell>
                        <a href={`/customers/${c.id}`} className="font-medium text-gray-900 hover:text-primary">
                          {c.companyName}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {(c.contacts.find((ct) => ct.isPrimary) ?? c.contacts[0])?.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {(c.contacts.find((ct) => ct.isPrimary) ?? c.contacts[0])?.phone ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{c._count?.contracts ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? 'success' : 'secondary'}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">{formatDate(c.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={syncMutation.isPending}
                          onClick={() => syncMutation.mutate(c.id)}
                          title="Sync with CRM"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
