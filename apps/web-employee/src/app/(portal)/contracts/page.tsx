'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, FileText, Zap, Droplets, Wind, Snowflake, ArrowRight, Filter } from 'lucide-react';
import {
  Card, CardContent, Badge, statusVariant, StatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, Input, Modal, ModalFooter, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';

const UTILITY_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  GAS:              { icon: <Wind className="h-4 w-4" />,      color: 'bg-orange-100 text-orange-700', label: 'Gas' },
  POWER:            { icon: <Zap className="h-4 w-4" />,       color: 'bg-blue-100 text-blue-700',    label: 'Power' },
  WATER:            { icon: <Droplets className="h-4 w-4" />,  color: 'bg-cyan-100 text-cyan-700',    label: 'Water' },
  DISTRICT_COOLING: { icon: <Snowflake className="h-4 w-4" />, color: 'bg-sky-100 text-sky-700',     label: 'Cooling' },
};

interface Contract {
  id: string;
  contractNumber: string;
  utilityType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  customer?: { companyName: string; customerCode: string };
  gasDetails?: { dcq: string };
  powerDetails?: { contractedKw: string };
  waterDetails?: { contractedM3: string };
  coolingDetails?: { contractedRt: string };
}

interface CustomerOption { id: string; companyName: string; customerCode: string }

function getCapacity(c: Contract): string {
  if (c.gasDetails?.dcq) return `${parseFloat(c.gasDetails.dcq).toLocaleString()} MMBTU/d`;
  if (c.powerDetails?.contractedKw) return `${parseFloat(c.powerDetails.contractedKw).toLocaleString()} kW`;
  if (c.waterDetails?.contractedM3) return `${parseFloat(c.waterDetails.contractedM3).toLocaleString()} m³`;
  if (c.coolingDetails?.contractedRt) return `${parseFloat(c.coolingDetails.contractedRt).toLocaleString()} RT`;
  return '—';
}

const STATUSES = ['', 'DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'];
const UTILITY_TYPES = ['', 'GAS', 'POWER', 'WATER', 'DISTRICT_COOLING'];

const EMPTY_FORM = {
  customerId: '',
  utilityType: 'GAS',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  siteAddress: '',
  notes: '',
  // Gas
  dcq: '', acq: '', basePrice: '', serviceCharge: '', overtakeSurcharge: '',
  // Power
  contractedKw: '',
  // Water
  contractedM3: '',
  // Cooling
  contractedRt: '', contractedTonHours: '', capacityChargePerRt: '', consumptionChargePerTh: '',
};

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [utilityFilter, setUtilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Contract[] }>({
    queryKey: ['contracts', utilityFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (utilityFilter) params.set('utilityType', utilityFilter);
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/contracts?${params.toString()}`).then((r) => r.data);
    },
  });

  const { data: customersData } = useQuery<{ data: CustomerOption[] }>({
    queryKey: ['customers-for-select'],
    queryFn: () => api.get('/customers?limit=200').then((r) => r.data),
    enabled: showModal,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        customerId: form.customerId,
        utilityType: form.utilityType,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        siteAddress: form.siteAddress || undefined,
        notes: form.notes || undefined,
      };
      if (form.utilityType === 'GAS') {
        payload.gasDetails = {
          dcq: form.dcq, acq: form.acq, basePrice: form.basePrice,
          serviceCharge: form.serviceCharge || '0.000000', overtakeSurcharge: form.overtakeSurcharge || '0.000000',
          contractYear: 1,
        };
      } else if (form.utilityType === 'POWER') {
        payload.powerDetails = { contractedKw: form.contractedKw };
      } else if (form.utilityType === 'WATER') {
        payload.waterDetails = { contractedM3: form.contractedM3 };
      } else if (form.utilityType === 'DISTRICT_COOLING') {
        payload.coolingDetails = {
          contractedRt: form.contractedRt, contractedTonHours: form.contractedTonHours,
          capacityChargePerRt: form.capacityChargePerRt, consumptionChargePerTh: form.consumptionChargePerTh,
        };
      }
      return api.post('/contracts', payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contracts'] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
  });

  const contracts = data?.data ?? [];
  const filtered = contracts.filter((c) =>
    !search ||
    c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.customer?.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === 'ACTIVE').length,
    pending: contracts.filter((c) => c.status === 'PENDING_APPROVAL').length,
    draft: contracts.filter((c) => c.status === 'DRAFT').length,
  };

  const customers = customersData?.data ?? [];

  function isFormValid(): boolean {
    if (!form.customerId || !form.startDate) return false;
    if (form.utilityType === 'GAS' && (!form.dcq || !form.acq || !form.basePrice)) return false;
    if (form.utilityType === 'POWER' && !form.contractedKw) return false;
    if (form.utilityType === 'WATER' && !form.contractedM3) return false;
    if (form.utilityType === 'DISTRICT_COOLING' && (!form.contractedRt || !form.contractedTonHours || !form.capacityChargePerRt || !form.consumptionChargePerTh)) return false;
    return true;
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500">Manage all utility contracts across customers</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Contract
        </Button>
      </div>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Contracts" value={stats.total} icon={<FileText className="h-5 w-5" />} />
          <StatCard title="Active" value={stats.active} icon={<FileText className="h-5 w-5" />} variant="success" />
          <StatCard title="Pending Approval" value={stats.pending} icon={<FileText className="h-5 w-5" />} variant="warning" />
          <StatCard title="Draft" value={stats.draft} icon={<FileText className="h-5 w-5" />} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="Search contract # or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="text-sm border rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={utilityFilter}
              onChange={(e) => setUtilityFilter(e.target.value)}
            >
              <option value="">All Utilities</option>
              {UTILITY_TYPES.slice(1).map((u) => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
            </select>
            <select
              className="text-sm border rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.slice(1).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16">
                <FileText className="h-14 w-14 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No contracts found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or create a new contract</p>
                <Button size="sm" className="mt-4" onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-1" /> New Contract
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Utility</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const meta = UTILITY_META[c.utilityType];
                    return (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => window.location.href = `/contracts/${c.id}`}>
                        <TableCell className="font-mono text-xs font-semibold text-gray-900">{c.contractNumber}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-gray-900">{c.customer?.companyName ?? '—'}</p>
                          <p className="text-xs text-gray-400">{c.customer?.customerCode}</p>
                        </TableCell>
                        <TableCell>
                          {meta && (
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.color}`}>
                                {meta.icon}
                              </span>
                              <span className="text-sm">{meta.label}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-700">{getCapacity(c)}</TableCell>
                        <TableCell><Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(c.startDate)}</TableCell>
                        <TableCell className="text-xs text-gray-500">{c.endDate ? formatDate(c.endDate) : '—'}</TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-gray-300" />
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

      {/* Create Contract Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New Contract" size="lg">
        <div className="space-y-5">
          {/* Basic Info */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Contract Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Customer <span className="text-red-500">*</span></label>
                <select
                  className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName} ({c.customerCode})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Utility Type <span className="text-red-500">*</span></label>
                <select
                  className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.utilityType}
                  onChange={(e) => setForm((f) => ({ ...f, utilityType: e.target.value }))}
                >
                  {Object.entries(UTILITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Start Date <span className="text-red-500">*</span></label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">End Date</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Site Address</label>
                <Input placeholder="e.g. Plot 15, KEZAD" value={form.siteAddress} onChange={(e) => setForm((f) => ({ ...f, siteAddress: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Gas Details */}
          {form.utilityType === 'GAS' && (
            <div className="border-t pt-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Gas Contract Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">DCQ (MMBTU/day) <span className="text-red-500">*</span></label>
                  <Input type="number" step="0.000001" placeholder="e.g. 15000" value={form.dcq} onChange={(e) => setForm((f) => ({ ...f, dcq: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ACQ (MMBTU/year) <span className="text-red-500">*</span></label>
                  <Input type="number" step="0.000001" placeholder="e.g. 5475000" value={form.acq} onChange={(e) => setForm((f) => ({ ...f, acq: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Base Price (AED/MMBTU) <span className="text-red-500">*</span></label>
                  <Input type="number" step="0.000001" placeholder="e.g. 1.850000" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Service Charge</label>
                  <Input type="number" step="0.000001" placeholder="e.g. 500.000000" value={form.serviceCharge} onChange={(e) => setForm((f) => ({ ...f, serviceCharge: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Overtake Surcharge</label>
                  <Input type="number" step="0.000001" placeholder="e.g. 0.250000" value={form.overtakeSurcharge} onChange={(e) => setForm((f) => ({ ...f, overtakeSurcharge: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {/* Power Details */}
          {form.utilityType === 'POWER' && (
            <div className="border-t pt-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Power Contract Details</p>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Contracted kW <span className="text-red-500">*</span></label>
                <Input type="number" step="0.000001" placeholder="e.g. 5000" value={form.contractedKw} onChange={(e) => setForm((f) => ({ ...f, contractedKw: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Water Details */}
          {form.utilityType === 'WATER' && (
            <div className="border-t pt-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Water Contract Details</p>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Contracted m³ <span className="text-red-500">*</span></label>
                <Input type="number" step="0.000001" placeholder="e.g. 2000" value={form.contractedM3} onChange={(e) => setForm((f) => ({ ...f, contractedM3: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Cooling Details */}
          {form.utilityType === 'DISTRICT_COOLING' && (
            <div className="border-t pt-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">District Cooling Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Contracted RT <span className="text-red-500">*</span></label>
                  <Input type="number" step="0.000001" placeholder="e.g. 1500" value={form.contractedRt} onChange={(e) => setForm((f) => ({ ...f, contractedRt: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Contracted Ton-Hours <span className="text-red-500">*</span></label>
                  <Input type="number" step="0.000001" placeholder="e.g. 5400000" value={form.contractedTonHours} onChange={(e) => setForm((f) => ({ ...f, contractedTonHours: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Capacity Charge (AED/RT/month) <span className="text-red-500">*</span></label>
                  <Input type="number" step="0.000001" placeholder="e.g. 120" value={form.capacityChargePerRt} onChange={(e) => setForm((f) => ({ ...f, capacityChargePerRt: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Consumption Charge (AED/ton-hr) <span className="text-red-500">*</span></label>
                  <Input type="number" step="0.000001" placeholder="e.g. 0.065" value={form.consumptionChargePerTh} onChange={(e) => setForm((f) => ({ ...f, consumptionChargePerTh: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="border-t pt-5">
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={2}
              placeholder="Optional notes about this contract..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {createMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              Failed to create contract. Please check all required fields and try again.
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}>Cancel</Button>
          <Button
            disabled={!isFormValid()}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <Plus className="h-4 w-4 mr-1" /> Create Contract
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
