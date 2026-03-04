'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Activity, Zap, Droplets, Wind, Snowflake, RefreshCw, BarChart3 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, StatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, Input, Modal, ModalFooter, Select, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';

const METER_TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  GAS:              { icon: <Wind className="h-4 w-4" />,      color: 'bg-orange-100 text-orange-700' },
  POWER:            { icon: <Zap className="h-4 w-4" />,       color: 'bg-blue-100 text-blue-700' },
  WATER:            { icon: <Droplets className="h-4 w-4" />,  color: 'bg-cyan-100 text-cyan-700' },
  DISTRICT_COOLING: { icon: <Snowflake className="h-4 w-4" />, color: 'bg-sky-100 text-sky-700' },
};

interface Meter {
  id: string;
  meterCode: string;
  meterType: string;
  serialNumber: string | null;
  location: string | null;
  scadaNodeId: string | null;
  isActive: boolean;
  installDate: string | null;
  contractId: string;
  _count?: { dataPoints: number; manualReadings: number };
}

export default function MetersPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [scadaModal, setScadaModal] = useState<string | null>(null);
  const [form, setForm] = useState({ contractId: '', meterType: 'POWER', serialNumber: '', location: '', scadaNodeId: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Meter[] }>({
    queryKey: ['meters', typeFilter],
    queryFn: () => api.get('/consumption/meters').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/consumption/meters', form),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['meters'] }); setShowModal(false); setForm({ contractId: '', meterType: 'POWER', serialNumber: '', location: '', scadaNodeId: '' }); },
  });

  const scadaMutation = useMutation({
    mutationFn: (meterId: string) => api.post('/consumption/mock/generate-scada', { meterId, days: 30 }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['meters'] }); setScadaModal(null); },
  });

  const meters = data?.data ?? [];
  const filtered = meters.filter((m) => {
    const matchType = !typeFilter || m.meterType === typeFilter;
    const matchSearch = !search || m.meterCode.toLowerCase().includes(search.toLowerCase()) || (m.location ?? '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const stats = {
    total: meters.length,
    active: meters.filter((m) => m.isActive).length,
    gas: meters.filter((m) => m.meterType === 'GAS').length,
    power: meters.filter((m) => m.meterType === 'POWER').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meter Management</h1>
          <p className="text-sm text-gray-500">Register and monitor all utility meters</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Register Meter
        </Button>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Meters" value={stats.total} icon={<Activity className="h-5 w-5" />} />
          <StatCard title="Active Meters" value={stats.active} icon={<Activity className="h-5 w-5" />} variant="success" />
          <StatCard title="Gas Meters" value={stats.gas} icon={<Wind className="h-5 w-5" />} />
          <StatCard title="Power Meters" value={stats.power} icon={<Zap className="h-5 w-5" />} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="Search by meter code or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="GAS">Gas</option>
            <option value="POWER">Power</option>
            <option value="WATER">Water</option>
            <option value="DISTRICT_COOLING">Cooling</option>
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !filtered.length ? (
              <div className="text-center py-16">
                <BarChart3 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No meters found</p>
                <p className="text-sm text-gray-400">Register your first meter to start collecting data</p>
                <Button className="mt-4" size="sm" onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Register Meter
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meter Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>SCADA Node</TableHead>
                    <TableHead>Data Points</TableHead>
                    <TableHead>Installed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const meta = METER_TYPE_META[m.meterType];
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs font-semibold">{m.meterCode}</TableCell>
                        <TableCell>
                          {meta && (
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.color}`}>{meta.icon}</span>
                              <span className="text-sm">{m.meterType.replace('_', ' ')}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{m.serialNumber ?? '—'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{m.location ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{m.scadaNodeId ?? '—'}</TableCell>
                        <TableCell className="text-sm font-medium">{(m._count?.dataPoints ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-gray-400">{m.installDate ? formatDate(m.installDate) : '—'}</TableCell>
                        <TableCell><Badge variant={m.isActive ? 'success' : 'secondary'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Generate mock SCADA data"
                            onClick={() => setScadaModal(m.id)}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Register Meter Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Register New Meter" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Contract ID</label>
            <Input placeholder="Enter contract ID" value={form.contractId} onChange={(e) => setForm((f) => ({ ...f, contractId: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Meter Type</label>
            <select className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.meterType} onChange={(e) => setForm((f) => ({ ...f, meterType: e.target.value }))}>
              <option value="GAS">Gas</option>
              <option value="POWER">Power</option>
              <option value="WATER">Water</option>
              <option value="DISTRICT_COOLING">District Cooling</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Serial Number</label>
            <Input placeholder="e.g. SN-2026-001" value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Location</label>
            <Input placeholder="e.g. KEZAD Zone A, Building 3" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">SCADA Node ID <span className="text-gray-400 font-normal">(optional)</span></label>
            <Input placeholder="e.g. SCADA_NODE_001" value={form.scadaNodeId} onChange={(e) => setForm((f) => ({ ...f, scadaNodeId: e.target.value }))} />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button disabled={!form.contractId} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Register Meter
          </Button>
        </ModalFooter>
      </Modal>

      {/* SCADA Generate Modal */}
      <Modal open={!!scadaModal} onClose={() => setScadaModal(null)} title="Generate Mock SCADA Data" size="sm">
        <p className="text-sm text-gray-500 mb-4">This will generate 30 days of mock SCADA data (hourly) for this meter. Existing data will be skipped.</p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setScadaModal(null)}>Cancel</Button>
          <Button loading={scadaMutation.isPending} onClick={() => scadaModal && scadaMutation.mutate(scadaModal)}>
            Generate Data
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
