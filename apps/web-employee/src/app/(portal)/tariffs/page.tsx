'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wind, Zap, Droplets, Snowflake, CheckCircle2, Clock, Tag, SendHorizonal, Eye } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, Input, Badge, Modal, ModalFooter, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface TariffRate {
  id: string;
  rateKey: string;
  description: string | null;
  rate: string;
  unit: string;
}

interface Tariff {
  id: string;
  utilityType: string;
  tariffType: string;
  name: string;
  description: string | null;
  currency: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  createdAt: string;
  rates: TariffRate[];
}

const UTILITY_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  GAS:              { icon: <Wind className="h-5 w-5" />,      color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Gas' },
  POWER:            { icon: <Zap className="h-5 w-5" />,       color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',   label: 'Power' },
  WATER:            { icon: <Droplets className="h-5 w-5" />,  color: 'text-cyan-600',   bg: 'bg-cyan-50 border-cyan-200',   label: 'Water' },
  DISTRICT_COOLING: { icon: <Snowflake className="h-5 w-5" />, color: 'text-sky-600',    bg: 'bg-sky-50 border-sky-200',     label: 'District Cooling' },
};

const UTILITY_TYPES = ['GAS', 'POWER', 'WATER', 'DISTRICT_COOLING'];
const TARIFF_TYPES = ['FIXED', 'TIERED', 'TIME_OF_USE', 'DEMAND', 'BLOCK_RATE'];

export default function TariffsPage() {
  const [selectedType, setSelectedType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewTariff, setViewTariff] = useState<Tariff | null>(null);
  const [submitMode, setSubmitMode] = useState<'direct' | 'workflow'>('direct');
  const [form, setForm] = useState({
    utilityType: 'GAS',
    tariffType: 'FIXED',
    name: '',
    description: '',
    currency: 'AED',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    rateCode: '',
    unitPrice: '',
    unit: '',
    changeJustification: '',
  });
  const [wfSuccess, setWfSuccess] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Tariff[] }>({
    queryKey: ['tariffs'],
    queryFn: () => api.get('/billing/tariffs').then((r) => r.data),
  });

  const resetForm = () => setForm({
    utilityType: 'GAS', tariffType: 'FIXED', name: '', description: '', currency: 'AED',
    effectiveFrom: new Date().toISOString().split('T')[0], effectiveTo: '', rateCode: '', unitPrice: '', unit: '', changeJustification: '',
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/billing/tariffs', {
      utilityType: form.utilityType,
      tariffType: form.tariffType,
      name: form.name,
      description: form.description || undefined,
      currency: form.currency,
      effectiveFrom: new Date(form.effectiveFrom).toISOString(),
      effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : undefined,
      rates: [{ rateKey: form.rateCode, rate: form.unitPrice, unit: form.unit }],
    }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['tariffs'] }); setShowModal(false); resetForm(); },
  });

  const workflowMutation = useMutation({
    mutationFn: () => api.post('/workflows', {
      workflowType: 'TARIFF_CHANGE_APPROVAL',
      entityType: 'TARIFF',
      entityId: 'new',
      notes: form.changeJustification,
      metadata: {
        utilityType: form.utilityType,
        tariffType: form.tariffType,
        tariffName: form.name,
        rateCode: form.rateCode,
        unitPrice: form.unitPrice,
        unit: form.unit,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
        currency: form.currency,
      },
    }),
    onSuccess: () => {
      setShowModal(false); resetForm(); setSubmitMode('direct'); setWfSuccess(true);
      setTimeout(() => setWfSuccess(false), 5000);
    },
  });

  const tariffs = data?.data ?? [];
  const filtered = selectedType ? tariffs.filter((t) => t.utilityType === selectedType) : tariffs;

  // Active tariff per utility type
  const activeTariffs = UTILITY_TYPES.map((ut) => ({
    type: ut,
    tariff: tariffs.find((t) => t.utilityType === ut && t.isActive),
  }));

  return (
    <div className="animate-fade-in">
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tariff Management</h1>
          <p className="text-sm text-gray-500">Version-controlled utility tariffs and rate schedules</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Tariff
        </Button>
      </div>

      {wfSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-8 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800 font-medium">Tariff change request submitted for approval. It will be reviewed by a manager before taking effect.</span>
        </div>
      )}

      <div className="p-8 space-y-6">
        {/* Active Tariffs Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {activeTariffs.map(({ type, tariff }) => {
            const meta = UTILITY_META[type];
            return (
              <Card
                key={type}
                className={`border-2 cursor-pointer transition-all hover:shadow-md ${meta.bg} ${tariff ? '' : 'opacity-60'}`}
                onClick={() => tariff && setViewTariff(tariff)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`${meta.color}`}>{meta.icon}</div>
                    <span className="font-semibold text-gray-800">{meta.label}</span>
                  </div>
                  {tariff ? (
                    <>
                      <p className="text-sm font-medium text-gray-900 truncate">{tariff.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{tariff.tariffType.replace('_', ' ')}</p>
                      {tariff.rates[0] && (
                        <p className="text-lg font-bold text-gray-900 mt-2">
                          {Number(tariff.rates[0].rate).toFixed(4)} <span className="text-xs text-gray-400 font-normal">/{tariff.rates[0].unit}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">Active since {formatDate(tariff.effectiveFrom)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">No active tariff</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${!selectedType ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}
          >
            All Types
          </button>
          {UTILITY_TYPES.map((ut) => {
            const meta = UTILITY_META[ut];
            return (
              <button
                key={ut}
                onClick={() => setSelectedType(ut === selectedType ? '' : ut)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${selectedType === ut ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>

        {/* Tariff Table */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400" /> Tariff Version History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16">
                <Tag className="h-14 w-14 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No tariffs found</p>
                <p className="text-sm text-gray-400 mt-1">Create the first tariff to begin billing operations</p>
                <Button className="mt-4" size="sm" onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create Tariff
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utility Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Rates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const meta = UTILITY_META[t.utilityType];
                    return (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setViewTariff(t)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta?.color ?? 'text-gray-400'} ${meta?.bg.split(' ')[0] ?? 'bg-gray-50'}`}>
                              {meta?.icon}
                            </span>
                            <span className="text-sm">{meta?.label ?? t.utilityType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t.tariffType.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{t.currency}</TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(t.effectiveFrom)}</TableCell>
                        <TableCell className="text-xs text-gray-500">{t.effectiveTo ? formatDate(t.effectiveTo) : <span className="text-green-600">Open-ended</span>}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {t.rates.slice(0, 2).map((r) => (
                              <div key={r.id} className="text-xs font-mono text-gray-600">
                                {r.rateKey}: <span className="font-semibold">{Number(r.rate).toFixed(4)}</span> <span className="text-gray-400">/{r.unit}</span>
                              </div>
                            ))}
                            {t.rates.length > 2 && <div className="text-xs text-gray-400">+{t.rates.length - 2} more rates</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.isActive ? 'success' : 'secondary'}>
                            {t.isActive ? 'Active' : 'Superseded'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewTariff(t); }}>
                            <Eye className="h-4 w-4 text-gray-400" />
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

      {/* View Tariff Detail Modal */}
      <Modal open={!!viewTariff} onClose={() => setViewTariff(null)} title="Tariff Details" size="lg">
        {viewTariff && (() => {
          const meta = UTILITY_META[viewTariff.utilityType];
          return (
            <div className="space-y-5">
              {/* Header */}
              <div className={`rounded-xl border-2 p-5 ${meta?.bg ?? 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={meta?.color ?? 'text-gray-500'}>{meta?.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{viewTariff.name}</h3>
                    <p className="text-sm text-gray-500">{viewTariff.description ?? 'No description'}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge variant={viewTariff.isActive ? 'success' : 'secondary'}>
                      {viewTariff.isActive ? 'Active' : 'Superseded'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Utility Type</p>
                  <p className="text-sm font-medium text-gray-900">{meta?.label ?? viewTariff.utilityType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Tariff Type</p>
                  <p className="text-sm font-medium text-gray-900">{viewTariff.tariffType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Currency</p>
                  <p className="text-sm font-medium text-gray-900">{viewTariff.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Effective From</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(viewTariff.effectiveFrom)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Effective To</p>
                  <p className="text-sm font-medium text-gray-900">{viewTariff.effectiveTo ? formatDate(viewTariff.effectiveTo) : 'Open-ended'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(viewTariff.createdAt)}</p>
                </div>
              </div>

              {/* Rate Schedule */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Rate Schedule</p>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rate Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Rate ({viewTariff.currency})</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewTariff.rates.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm font-semibold text-gray-900">{r.rateKey}</TableCell>
                          <TableCell className="text-sm text-gray-500">{r.description ?? '—'}</TableCell>
                          <TableCell className="text-right text-lg font-bold text-primary">{Number(r.rate).toFixed(6)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{r.unit}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          );
        })()}
        <ModalFooter>
          <Button variant="outline" onClick={() => setViewTariff(null)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Create Tariff Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setSubmitMode('direct'); }} title="Create New Tariff" size="lg">
        {/* Submit Mode Toggle */}
        <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubmitMode('direct')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${submitMode === 'direct' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <CheckCircle2 className="h-4 w-4" /> Create Directly
          </button>
          <button
            type="button"
            onClick={() => setSubmitMode('workflow')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${submitMode === 'workflow' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <SendHorizonal className="h-4 w-4" /> Submit for Approval
          </button>
        </div>
        {submitMode === 'workflow' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            The tariff will be submitted as a <strong>Tariff Change Approval</strong> workflow. A manager must approve it before it becomes active.
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Utility Type</label>
            <select
              className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.utilityType}
              onChange={(e) => setForm((f) => ({ ...f, utilityType: e.target.value }))}
            >
              {UTILITY_TYPES.map((ut) => <option key={ut} value={ut}>{UTILITY_META[ut].label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Tariff Type</label>
            <select
              className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.tariffType}
              onChange={(e) => setForm((f) => ({ ...f, tariffType: e.target.value }))}
            >
              {TARIFF_TYPES.map((tt) => <option key={tt} value={tt}>{tt.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Tariff Name</label>
            <Input placeholder="e.g. Industrial Gas Tariff 2026" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <Input placeholder="Brief description of this tariff" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Currency</label>
            <select
              className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            >
              <option value="AED">AED</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Effective From</label>
            <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Effective To <span className="text-gray-400 font-normal">(leave blank for open-ended)</span></label>
            <Input type="date" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} />
          </div>

          <div className="col-span-2 border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Primary Rate</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rate Code</label>
            <Input placeholder="e.g. BASE_RATE" value={form.rateCode} onChange={(e) => setForm((f) => ({ ...f, rateCode: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Unit</label>
            <select
              className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            >
              <option value="">Select unit</option>
              <option value="MMBTU">MMBTU (Gas)</option>
              <option value="kWh">kWh (Power)</option>
              <option value="kW">kW (Power Demand)</option>
              <option value="m3">m³ (Water)</option>
              <option value="RTh">RTh (Cooling)</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Unit Price (AED)</label>
            <Input type="number" step="0.000001" placeholder="e.g. 1.850000" value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} />
          </div>

          {submitMode === 'workflow' && (
            <div className="col-span-2 border-t pt-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Change Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Explain the reason for this tariff change (required for approval workflow)..."
                value={form.changeJustification}
                onChange={(e) => setForm((f) => ({ ...f, changeJustification: e.target.value }))}
              />
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setShowModal(false); setSubmitMode('direct'); }}>Cancel</Button>
          {submitMode === 'direct' ? (
            <Button
              disabled={!form.name || !form.rateCode || !form.unitPrice || !form.unit}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create Tariff
            </Button>
          ) : (
            <Button
              disabled={!form.name || !form.rateCode || !form.unitPrice || !form.unit || !form.changeJustification}
              loading={workflowMutation.isPending}
              onClick={() => workflowMutation.mutate()}
            >
              <SendHorizonal className="h-4 w-4 mr-2" /> Submit for Approval
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
