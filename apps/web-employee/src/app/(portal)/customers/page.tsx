'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, RefreshCw, Building2, Users, CheckCircle2, XCircle } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, Input, StatCard, Modal, ModalFooter, formatDate,
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

const EMPTY_FORM = {
  companyName: '',
  tradeLicenseNo: '',
  vatRegistrationNo: '',
  industry: '',
  contactName: '',
  contactRole: '',
  contactEmail: '',
  contactPhone: '',
  street: '',
  city: '',
  emirate: 'Abu Dhabi',
  poBox: '',
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Customer[] }>({
    queryKey: ['customers', search],
    queryFn: () => api.get(`/customers?search=${encodeURIComponent(search)}`).then((r) => r.data),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.post(`/customers/${id}/crm-sync`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/customers', {
      companyName: form.companyName,
      tradeLicenseNo: form.tradeLicenseNo || undefined,
      vatRegistrationNo: form.vatRegistrationNo || undefined,
      industry: form.industry || undefined,
      address: form.street ? {
        street: form.street,
        city: form.city,
        emirate: form.emirate,
        poBox: form.poBox || undefined,
        country: 'UAE',
      } : undefined,
      contacts: [{
        name: form.contactName,
        role: form.contactRole || undefined,
        email: form.contactEmail,
        phone: form.contactPhone || undefined,
        isPrimary: true,
      }],
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
  });

  const customers = data?.data ?? [];

  return (
    <div className="animate-fade-in">
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">Manage industrial investors and CRM sync</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
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
            className="w-full max-w-md pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
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
              <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />)}</div>
            ) : !customers.length ? (
              <div className="text-center py-16">
                <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No customers found</p>
                <p className="text-sm text-gray-400 mt-1">Add your first customer to get started</p>
                <Button size="sm" className="mt-4" onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Customer
                </Button>
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
                    <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => window.location.href = `/customers/${c.id}`}>
                      <TableCell className="font-mono text-xs font-medium">{c.customerCode}</TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 hover:text-primary">
                          {c.companyName}
                        </span>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
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

      {/* Add Customer Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Customer" size="lg">
        <div className="space-y-5">
          {/* Company Info */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Company Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Company Name <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. Global Steel Manufacturing LLC" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Trade License No.</label>
                <Input placeholder="e.g. CN-1234567" value={form.tradeLicenseNo} onChange={(e) => setForm((f) => ({ ...f, tradeLicenseNo: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">VAT Registration No.</label>
                <Input placeholder="e.g. 100000000000003" value={form.vatRegistrationNo} onChange={(e) => setForm((f) => ({ ...f, vatRegistrationNo: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Industry</label>
                <select
                  className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                >
                  <option value="">Select industry</option>
                  <option value="Steel & Metal">Steel & Metal</option>
                  <option value="Petrochemicals">Petrochemicals</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Food Processing">Food Processing</option>
                  <option value="Pharmaceuticals">Pharmaceuticals</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Primary Contact */}
          <div className="border-t pt-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Primary Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. Ahmed Al Rashid" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Role</label>
                <Input placeholder="e.g. Head of Procurement" value={form.contactRole} onChange={(e) => setForm((f) => ({ ...f, contactRole: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email <span className="text-red-500">*</span></label>
                <Input type="email" placeholder="e.g. ahmed@company.ae" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                <Input placeholder="e.g. +971 50 123 4567" value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t pt-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Address <span className="text-gray-300 font-normal">(Optional)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Street</label>
                <Input placeholder="e.g. Plot 15, Industrial Area" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">City</label>
                <Input placeholder="e.g. Abu Dhabi" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Emirate</label>
                <select
                  className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.emirate}
                  onChange={(e) => setForm((f) => ({ ...f, emirate: e.target.value }))}
                >
                  <option value="Abu Dhabi">Abu Dhabi</option>
                  <option value="Dubai">Dubai</option>
                  <option value="Sharjah">Sharjah</option>
                  <option value="Ajman">Ajman</option>
                  <option value="Umm Al Quwain">Umm Al Quwain</option>
                  <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                  <option value="Fujairah">Fujairah</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">P.O. Box</label>
                <Input placeholder="e.g. 54115" value={form.poBox} onChange={(e) => setForm((f) => ({ ...f, poBox: e.target.value }))} />
              </div>
            </div>
          </div>

          {createMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              Failed to create customer. Please check all required fields and try again.
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}>Cancel</Button>
          <Button
            disabled={!form.companyName || !form.contactName || !form.contactEmail}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <Plus className="h-4 w-4 mr-1" /> Create Customer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
