'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Zap, Droplets, Wind, Snowflake, AlertTriangle, CheckCircle,
  XCircle, FileText, Receipt, Activity, Clock, BarChart3,
  Building2, Download, RefreshCw, Edit3,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, statusVariant,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, StatCard, Tabs, Timeline, InfoBanner, formatDate, formatCurrency, formatNumber,
} from '@kezad/ui';
import { api } from '@/lib/api';

const UTILITY_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  GAS:              { icon: <Wind className="h-6 w-6" />,      color: 'text-orange-600', bg: 'bg-orange-100', label: 'Industrial Gas' },
  POWER:            { icon: <Zap className="h-6 w-6" />,       color: 'text-blue-600',   bg: 'bg-blue-100',   label: 'Power' },
  WATER:            { icon: <Droplets className="h-6 w-6" />,  color: 'text-cyan-600',   bg: 'bg-cyan-100',   label: 'Water' },
  DISTRICT_COOLING: { icon: <Snowflake className="h-6 w-6" />, color: 'text-sky-600',    bg: 'bg-sky-100',    label: 'District Cooling' },
};

interface ContractDetail {
  id: string; contractNumber: string; utilityType: string; status: string;
  version: number; startDate: string; endDate: string | null;
  siteAddress: Record<string, string> | null; notes: string | null;
  regulatoryRef: string | null; createdAt: string; updatedAt: string;
  customer: { id: string; companyName: string; customerCode: string };
  gasDetails?: {
    dcq: string; acq: string; basePrice: string; serviceCharge: string;
    overtakeSurcharge: string; topThresholdPct: string; overtakeThresholdPct: string;
    contractYear: number; nominatedQuantities: { month: number; year: number; quantity: string; submittedAt: string }[];
  };
  powerDetails?: { contractedKw: string; peakHoursStart: string; peakHoursEnd: string };
  waterDetails?: { contractedM3: string };
  coolingDetails?: { contractedRt: string; contractedTonHours: string; capacityChargePerRt: string; consumptionChargePerTh: string };
  meters: { id: string; meterCode: string; meterType: string; location: string; isActive: boolean }[];
  versions: { id: string; version: number; createdAt: string; reason: string }[];
  amendments: { id: string; type: string; status: string; effectiveDate: string; summary: string; createdAt: string }[];
}

interface Invoice {
  id: string; invoiceNumber: string; status: string; totalAmount: string;
  periodFrom: string; periodTo: string; dueDate: string; issueDate: string;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-44 flex-shrink-0 pt-0.5 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-900 flex-1 font-medium">{value ?? '—'}</span>
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: <FileText className="h-4 w-4" /> },
  { id: 'invoices', label: 'Invoices', icon: <Receipt className="h-4 w-4" /> },
  { id: 'meters', label: 'Meters', icon: <Activity className="h-4 w-4" /> },
  { id: 'history', label: 'History', icon: <Clock className="h-4 w-4" /> },
];

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState('overview');
  const [terminateModal, setTerminateModal] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  // Amendment modal
  const [amendModal, setAmendModal] = useState(false);
  const [amendType, setAmendType] = useState('CONSUMPTION_PROFILE_UPDATE');
  const [amendSummary, setAmendSummary] = useState('');
  const [amendNotes, setAmendNotes] = useState('');
  // Year-end reconciliation
  const [reconcileModal, setReconcileModal] = useState(false);
  const [reconcileYear, setReconcileYear] = useState(new Date().getFullYear() - 1);
  const [reconcileTotalBilled, setReconcileTotalBilled] = useState('');
  const [reconcileResult, setReconcileResult] = useState<Record<string, unknown> | null>(null);
  const qc = useQueryClient();

  const { data: contract, isLoading } = useQuery<ContractDetail>({
    queryKey: ['contract', id],
    queryFn: () => api.get(`/contracts/${id}`).then((r) => r.data.data as ContractDetail),
  });

  const { data: invoices } = useQuery<{ data: Invoice[] }>({
    queryKey: ['invoices', 'contract', id],
    queryFn: () => api.get(`/billing/invoices?contractId=${id}`).then((r) => r.data),
    enabled: tab === 'invoices',
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/activate`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contract', id] }),
  });

  const terminateMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/terminate`, { reason: terminateReason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['contract', id] }); setTerminateModal(false); },
  });

  const amendMutation = useMutation({
    mutationFn: () => api.post('/workflows', {
      workflowType: amendType === 'CONSUMPTION_PROFILE_UPDATE' ? 'CONSUMPTION_PROFILE_UPDATE' : 'CONTRACT_APPROVAL',
      entityType: 'CONTRACT',
      entityId: id,
      contractId: id,
      notes: amendNotes,
      metadata: { amendmentType: amendType, summary: amendSummary },
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contract', id] });
      setAmendModal(false); setAmendSummary(''); setAmendNotes('');
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/year-end-reconciliation`, {
      periodYear: reconcileYear,
      totalBilledAmount: reconcileTotalBilled,
    }),
    onSuccess: (res) => { setReconcileResult(res.data.data as Record<string, unknown>); },
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in p-8 space-y-6">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!contract) return (
    <div className="p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Contract not found</p>
      <a href="/contracts" className="text-primary text-sm hover:underline mt-2 inline-block">← Back to Contracts</a>
    </div>
  );

  const meta = UTILITY_META[contract.utilityType] ?? UTILITY_META.POWER!;
  const canActivate = contract.status === 'PENDING_APPROVAL';
  const canTerminate = ['ACTIVE', 'SUSPENDED'].includes(contract.status);
  const invoiceList = invoices?.data ?? [];
  const totalBilled = invoiceList.reduce((s, i) => s + parseFloat(i.totalAmount), 0);

  const historyItems = [
    ...contract.versions.map((v) => ({
      id: `v${v.id}`, title: `Version ${v.version} created`, description: v.reason,
      timestamp: formatDate(v.createdAt), variant: 'info' as const,
    })),
    ...contract.amendments.map((a) => ({
      id: `a${a.id}`, title: `Amendment: ${a.type.replace(/_/g, ' ')}`, description: a.summary,
      timestamp: formatDate(a.createdAt), variant: a.status === 'APPROVED' ? 'success' as const : 'warning' as const,
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white border-b">
        <div className="px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/contracts" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div className={`w-12 h-12 rounded-xl ${meta.bg} flex items-center justify-center ${meta.color}`}>
              {meta.icon}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{contract.contractNumber}</h1>
                <Badge variant={statusVariant(contract.status)}>{contract.status.replace(/_/g, ' ')}</Badge>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">v{contract.version}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {meta.label} ·{' '}
                <a href={`/customers/${contract.customer.id}`} className="text-primary hover:underline">
                  {contract.customer.companyName}
                </a>
                {' '}· {formatDate(contract.startDate)}{contract.endDate ? ` → ${formatDate(contract.endDate)}` : ' (ongoing)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contract.utilityType === 'GAS' && canTerminate && (
              <Button size="sm" variant="outline" onClick={() => { setReconcileResult(null); setReconcileModal(true); }}>
                <RefreshCw className="h-4 w-4 mr-2" /> Year-End Reconciliation
              </Button>
            )}
            {canTerminate && (
              <Button size="sm" variant="outline" onClick={() => setAmendModal(true)}>
                <Edit3 className="h-4 w-4 mr-2" /> Create Amendment
              </Button>
            )}
            {canActivate && (
              <Button size="sm" loading={activateMutation.isPending} onClick={() => activateMutation.mutate()}>
                <CheckCircle className="h-4 w-4 mr-2" /> Activate
              </Button>
            )}
            {canTerminate && (
              <Button size="sm" variant="destructive" onClick={() => setTerminateModal(true)}>
                <XCircle className="h-4 w-4 mr-2" /> Terminate
              </Button>
            )}
          </div>
        </div>
        <Tabs tabs={TABS} active={tab} onChange={setTab} className="px-8" />
      </div>

      <div className="p-8">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard title="Total Billed" value={formatCurrency(totalBilled)} variant="success" icon={<Receipt className="h-5 w-5" />} />
              <StatCard title="Active Meters" value={contract.meters.filter((m) => m.isActive).length} icon={<Activity className="h-5 w-5" />} />
              <StatCard title="Invoices" value={invoiceList.length} icon={<FileText className="h-5 w-5" />} />
              <StatCard title="Amendments" value={contract.amendments.length} icon={<Clock className="h-5 w-5" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contract Terms */}
              <Card>
                <CardHeader className="pb-0"><CardTitle className="text-base">Contract Terms</CardTitle></CardHeader>
                <CardContent className="pt-4">
                  {contract.utilityType === 'GAS' && contract.gasDetails && (
                    <>
                      <InfoRow label="Daily Contract Qty" value={`${parseFloat(contract.gasDetails.dcq).toLocaleString()} MMBTU/day`} />
                      <InfoRow label="Annual Contract Qty" value={`${parseFloat(contract.gasDetails.acq).toLocaleString()} MMBTU/year`} />
                      <InfoRow label="Base Price" value={`AED ${parseFloat(contract.gasDetails.basePrice).toFixed(4)}/MMBTU`} />
                      <InfoRow label="Service Charge" value={`AED ${parseFloat(contract.gasDetails.serviceCharge).toFixed(4)}/MMBTU`} />
                      <InfoRow label="Overtake Surcharge" value={`AED ${parseFloat(contract.gasDetails.overtakeSurcharge).toFixed(4)}/MMBTU`} />
                      <InfoRow label="Top Threshold" value={`${contract.gasDetails.topThresholdPct}%`} />
                      <InfoRow label="Overtake Threshold" value={`${contract.gasDetails.overtakeThresholdPct}%`} />
                      <InfoRow label="Contract Year" value={`Year ${contract.gasDetails.contractYear}`} />
                    </>
                  )}
                  {contract.utilityType === 'POWER' && contract.powerDetails && (
                    <>
                      <InfoRow label="Contracted Demand" value={`${parseFloat(contract.powerDetails.contractedKw).toLocaleString()} kW`} />
                      <InfoRow label="Peak Hours" value={`${contract.powerDetails.peakHoursStart} – ${contract.powerDetails.peakHoursEnd}`} />
                    </>
                  )}
                  {contract.utilityType === 'WATER' && contract.waterDetails && (
                    <InfoRow label="Contracted Volume" value={`${parseFloat(contract.waterDetails.contractedM3).toLocaleString()} m³/month`} />
                  )}
                  {contract.utilityType === 'DISTRICT_COOLING' && contract.coolingDetails && (
                    <>
                      <InfoRow label="Contracted RT" value={`${parseFloat(contract.coolingDetails.contractedRt).toLocaleString()} RT`} />
                      <InfoRow label="Contracted Ton-Hours" value={`${parseFloat(contract.coolingDetails.contractedTonHours).toLocaleString()} TH`} />
                      <InfoRow label="Capacity Charge" value={`AED ${parseFloat(contract.coolingDetails.capacityChargePerRt).toFixed(4)}/RT`} />
                      <InfoRow label="Consumption Charge" value={`AED ${parseFloat(contract.coolingDetails.consumptionChargePerTh).toFixed(4)}/TH`} />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Site & Admin */}
              <Card>
                <CardHeader className="pb-0"><CardTitle className="text-base">Site & Administration</CardTitle></CardHeader>
                <CardContent className="pt-4">
                  <InfoRow label="Regulatory Ref" value={contract.regulatoryRef} />
                  <InfoRow label="Version" value={`v${contract.version}`} />
                  <InfoRow label="Created" value={formatDate(contract.createdAt)} />
                  <InfoRow label="Last Updated" value={formatDate(contract.updatedAt)} />
                  {contract.siteAddress && (
                    <InfoRow label="Site Address" value={
                      Object.values(contract.siteAddress as Record<string, string>).filter(Boolean).join(', ')
                    } />
                  )}
                  {contract.notes && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                      <p className="font-semibold mb-1">Notes</p>
                      <p>{contract.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gas Nominated Quantities */}
            {contract.utilityType === 'GAS' && (contract.gasDetails?.nominatedQuantities?.length ?? 0) > 0 && (
              <Card>
                <CardHeader><CardTitle>Nominated Quantities (Recent)</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month/Year</TableHead>
                        <TableHead>Nominated Quantity (MMBTU)</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(contract.gasDetails?.nominatedQuantities ?? []).map((nq, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{nq.month}/{nq.year}</TableCell>
                          <TableCell className="font-mono">{parseFloat(nq.quantity).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-gray-400">{formatDate(nq.submittedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* INVOICES TAB */}
        {tab === 'invoices' && (
          <Card>
            <CardHeader><CardTitle>Invoice History ({invoiceList.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!invoiceList.length ? (
                <div className="text-center py-12">
                  <Receipt className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No invoices generated yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceList.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(inv.periodFrom)} – {formatDate(inv.periodTo)}</TableCell>
                        <TableCell className="text-xs">{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className={`text-xs ${inv.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {formatDate(inv.dueDate)}
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => window.open(`/api/v1/billing/invoices/${inv.id}/pdf`)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* METERS TAB */}
        {tab === 'meters' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Meters ({contract.meters.length})</CardTitle>
              <Button size="sm" variant="outline">
                <Activity className="h-4 w-4 mr-2" /> Register Meter
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {!contract.meters.length ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No meters registered</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meter Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.meters.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs font-semibold">{m.meterCode}</TableCell>
                        <TableCell>{m.meterType}</TableCell>
                        <TableCell className="text-sm text-gray-500">{m.location}</TableCell>
                        <TableCell><Badge variant={m.isActive ? 'success' : 'secondary'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <Card>
            <CardHeader><CardTitle>Contract History</CardTitle></CardHeader>
            <CardContent>
              <Timeline items={historyItems.length ? historyItems : [{
                id: 'created', title: 'Contract created', description: `Version 1 created`,
                timestamp: formatDate(contract.createdAt), variant: 'info',
              }]} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Amendment Modal */}
      {amendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAmendModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Create Contract Amendment</h3>
            <p className="text-sm text-gray-500 mb-4">Submit an amendment request for workflow approval. Changes will take effect after all approval levels are completed.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Amendment Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={amendType}
                  onChange={(e) => setAmendType(e.target.value)}
                >
                  <option value="CONSUMPTION_PROFILE_UPDATE">Consumption Profile Update</option>
                  <option value="PRICE_ESCALATION">Price Escalation</option>
                  <option value="CONTRACT_TERM_MODIFICATION">Contract Term Modification</option>
                  <option value="CONTRACT_RENEWAL">Contract Renewal</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Amendment Summary</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Brief description of the change..."
                  value={amendSummary}
                  onChange={(e) => setAmendSummary(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Justification / Notes</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
                  placeholder="Provide detailed justification for this amendment..."
                  value={amendNotes}
                  onChange={(e) => setAmendNotes(e.target.value)}
                />
              </div>
              {amendMutation.isError && <p className="text-sm text-red-600">Failed to submit amendment. Please try again.</p>}
              {amendMutation.isSuccess && <p className="text-sm text-green-600">Amendment workflow submitted successfully.</p>}
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                className="flex-1"
                disabled={!amendSummary.trim() || !amendNotes.trim()}
                loading={amendMutation.isPending}
                onClick={() => amendMutation.mutate()}
              >
                <Edit3 className="h-4 w-4 mr-2" /> Submit Amendment
              </Button>
              <Button variant="outline" onClick={() => setAmendModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Year-End Reconciliation Modal */}
      {reconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReconcileModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Year-End Gas Reconciliation</h3>
            <p className="text-sm text-gray-500 mb-4">Calculate wash-up or wash-down for this gas contract based on ACQ vs. actual consumption.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Contract Year</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={reconcileYear}
                  onChange={(e) => setReconcileYear(Number(e.target.value))}
                >
                  {[-2,-1,0].map((offset) => {
                    const y = new Date().getFullYear() + offset;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Total Billed Amount (AED)</label>
                <input
                  type="number" step="0.01" min="0"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. 2500000.00"
                  value={reconcileTotalBilled}
                  onChange={(e) => setReconcileTotalBilled(e.target.value)}
                />
              </div>
              {reconcileResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-1">
                  <p className="font-semibold text-blue-800 mb-2">Reconciliation Result</p>
                  {Object.entries(reconcileResult).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-blue-600 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium text-blue-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {reconcileMutation.isError && <p className="text-sm text-red-600">Reconciliation failed. Ensure contract has active gas details.</p>}
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                className="flex-1"
                disabled={!reconcileTotalBilled}
                loading={reconcileMutation.isPending}
                onClick={() => reconcileMutation.mutate()}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Calculate Reconciliation
              </Button>
              <Button variant="outline" onClick={() => setReconcileModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {terminateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTerminateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Terminate Contract</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone. The contract will be terminated.</p>
            <InfoBanner variant="warning" message="All active billing cycles will be closed and meters deactivated." className="mb-4" />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Reason for Termination</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
                placeholder="Provide reason for termination..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!terminateReason.trim()}
                loading={terminateMutation.isPending}
                onClick={() => terminateMutation.mutate()}
              >
                <XCircle className="h-4 w-4 mr-2" /> Confirm Termination
              </Button>
              <Button variant="outline" onClick={() => setTerminateModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
