'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Download, RefreshCw, FileText, Minus, CreditCard, AlertTriangle, Search } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, statusVariant,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, StatCard, formatCurrency, formatDate, formatDateTime,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface BillingRun {
  id: string; runCode: string; periodFrom: string; periodTo: string;
  status: string; totalInvoices: number; totalAmount: string | null;
  startedAt: string | null; completedAt: string | null; triggeredBy: string;
}

interface Invoice {
  id: string; invoiceNumber: string; utilityType: string; status: string;
  totalAmount: string; outstandingAmount: string; paidAmount: string;
  issueDate: string; dueDate: string; currency: string;
  contract?: { contractNumber: string; customer: { companyName: string } };
}

type BillingView = 'runs' | 'invoices';

export default function BillingPage() {
  const [view, setView] = useState<BillingView>('runs');
  const [runModal, setRunModal] = useState(false);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('ALL');

  // Adjustment modal
  const [adjModal, setAdjModal] = useState(false);
  const [adjInvoice, setAdjInvoice] = useState<Invoice | null>(null);
  const [adjDesc, setAdjDesc] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // Credit note modal
  const [cnModal, setCnModal] = useState(false);
  const [cnInvoice, setCnInvoice] = useState<Invoice | null>(null);
  const [cnAmount, setCnAmount] = useState('');
  const [cnReason, setCnReason] = useState('');

  const qc = useQueryClient();

  const { data: runs, isLoading: runsLoading } = useQuery<{ data: BillingRun[] }>({
    queryKey: ['billing-runs'],
    queryFn: () => api.get('/billing/runs').then((r) => r.data),
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ data: Invoice[] }>({
    queryKey: ['all-invoices', invStatus],
    queryFn: () => api.get('/billing/invoices', { params: { limit: 50, ...(invStatus !== 'ALL' ? { status: invStatus } : {}) } }).then((r) => r.data),
    enabled: view === 'invoices',
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.post('/billing/runs', {
      periodFrom: new Date(periodFrom).toISOString(),
      periodTo: new Date(periodTo).toISOString(),
      utilityTypes: ['GAS', 'POWER', 'WATER', 'DISTRICT_COOLING'],
    }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['billing-runs'] }); void qc.invalidateQueries({ queryKey: ['kpi'] }); setRunModal(false); },
  });

  const adjMutation = useMutation({
    mutationFn: () => api.post(`/billing/invoices/${adjInvoice?.id}/adjust`, { description: adjDesc, amount: adjAmount, reason: adjReason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['all-invoices'] }); setAdjModal(false); setAdjDesc(''); setAdjAmount(''); setAdjReason(''); },
  });

  const cnMutation = useMutation({
    mutationFn: () => api.post('/billing/credit-notes', { invoiceId: cnInvoice?.id, amount: cnAmount, reason: cnReason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['all-invoices'] }); setCnModal(false); setCnAmount(''); setCnReason(''); },
  });

  const billingRuns = runs?.data ?? [];
  const completed = billingRuns.filter((r) => r.status === 'COMPLETED');
  const totalRevenue = completed.reduce((s, r) => s + parseFloat(r.totalAmount ?? '0'), 0);
  const totalInvoices = completed.reduce((s, r) => s + r.totalInvoices, 0);

  const allInvoices = invoicesData?.data ?? [];
  const filteredInvoices = allInvoices.filter((inv) =>
    !invSearch || inv.invoiceNumber.toLowerCase().includes(invSearch.toLowerCase()) ||
    inv.contract?.customer?.companyName.toLowerCase().includes(invSearch.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Billing Operations</h1>
          <p className="text-sm text-gray-500">Manage billing runs, invoices, and adjustments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'runs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setView('runs')}
            >Billing Runs</button>
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'invoices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setView('invoices')}
            >Invoice Management</button>
          </div>
          {view === 'runs' && (
            <Button onClick={() => setRunModal(true)}>
              <Play className="h-4 w-4 mr-2" /> Trigger Billing Run
            </Button>
          )}
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Revenue (All Runs)" value={formatCurrency(totalRevenue)} variant="success" />
          <StatCard title="Invoices Generated" value={totalInvoices.toLocaleString()} />
          <StatCard title="Completed Runs" value={completed.length} />
        </div>

        {/* ── BILLING RUNS VIEW ──────────────────────────────── */}
        {view === 'runs' && (
          <Card>
            <CardHeader><CardTitle>Billing Run History</CardTitle></CardHeader>
            <CardContent className="p-0">
              {runsLoading ? (
                <div className="p-6 space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run Code</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead>
                      <TableHead>Invoices</TableHead><TableHead>Total Revenue</TableHead>
                      <TableHead>Triggered By</TableHead><TableHead>Started</TableHead><TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-mono text-xs font-medium">{run.runCode}</TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(run.periodFrom)} – {formatDate(run.periodTo)}</TableCell>
                        <TableCell><Badge variant={statusVariant(run.status)}>{run.status}</Badge></TableCell>
                        <TableCell>{run.totalInvoices.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{run.totalAmount ? formatCurrency(run.totalAmount) : '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{run.triggeredBy?.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs text-gray-400">{run.startedAt ? formatDateTime(run.startedAt) : '—'}</TableCell>
                        <TableCell className="text-xs text-gray-400">
                          {run.completedAt ? formatDateTime(run.completedAt) : (
                            <span className="flex items-center gap-1 text-amber-600"><RefreshCw className="h-3 w-3 animate-spin" /> Running</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── INVOICE MANAGEMENT VIEW ────────────────────────── */}
        {view === 'invoices' && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle>Invoice Management</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      className="pl-9 pr-4 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
                      placeholder="Search by invoice # or customer..."
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="SENT">Sent</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="DISPUTED">Disputed</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="p-6 space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead><TableHead>Customer</TableHead><TableHead>Utility</TableHead>
                      <TableHead>Issue Date</TableHead><TableHead>Due Date</TableHead>
                      <TableHead>Total</TableHead><TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => (
                      <TableRow key={inv.id} className={inv.status === 'DISPUTED' ? 'bg-amber-50/40' : inv.status === 'OVERDUE' ? 'bg-red-50/30' : ''}>
                        <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-sm">{inv.contract?.customer?.companyName ?? '—'}</TableCell>
                        <TableCell><Badge variant="secondary">{inv.utilityType.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className={`text-xs ${inv.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell className={parseFloat(inv.outstandingAmount) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                          {parseFloat(inv.outstandingAmount) > 0 ? formatCurrency(inv.outstandingAmount) : '—'}
                        </TableCell>
                        <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" title="Download PDF"
                              onClick={() => window.open(`/api/v1/billing/invoices/${inv.id}/pdf`)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            {!['PAID', 'VOID', 'CANCELLED'].includes(inv.status) && (
                              <Button variant="ghost" size="icon" title="Apply Adjustment"
                                onClick={() => { setAdjInvoice(inv); setAdjModal(true); }}>
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!['PAID', 'VOID', 'CANCELLED'].includes(inv.status) && (
                              <Button variant="ghost" size="icon" title="Issue Credit Note"
                                onClick={() => { setCnInvoice(inv); setCnModal(true); }}>
                                <CreditCard className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {inv.status === 'DISPUTED' && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 ml-1" aria-label="Disputed" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                          No invoices match the selected filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trigger Run Modal */}
      {runModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Trigger Billing Run</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Billing Period From</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Billing Period To</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                This will generate invoices for all active contracts in the period. This action cannot be undone.
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button className="flex-1" loading={triggerMutation.isPending} disabled={!periodFrom || !periodTo} onClick={() => triggerMutation.mutate()}>
                <Play className="h-4 w-4 mr-2" /> Start Billing Run
              </Button>
              <Button variant="outline" onClick={() => setRunModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Adjustment Modal */}
      {adjModal && adjInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAdjModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Apply Invoice Adjustment</h3>
            <p className="text-sm text-gray-500 mb-1">Invoice: <span className="font-mono font-medium">{adjInvoice.invoiceNumber}</span></p>
            <p className="text-sm text-gray-500 mb-4">Outstanding: <span className="font-medium text-red-600">{formatCurrency(adjInvoice.outstandingAmount)}</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. Meter reading correction" value={adjDesc} onChange={(e) => setAdjDesc(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Amount (AED) — use negative for credit, positive for charge</label>
                <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. -500.00 or 250.00" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Reason / Authorization</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[70px]" placeholder="Reason for adjustment and approving authority..." value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
              </div>
              {adjMutation.isError && <p className="text-sm text-red-600">Failed to apply adjustment. Please try again.</p>}
              {adjMutation.isSuccess && <p className="text-sm text-green-600">Adjustment applied successfully.</p>}
            </div>
            <div className="flex gap-3 mt-4">
              <Button className="flex-1" disabled={!adjDesc || !adjAmount || !adjReason} loading={adjMutation.isPending} onClick={() => adjMutation.mutate()}>
                <Minus className="h-4 w-4 mr-2" /> Apply Adjustment
              </Button>
              <Button variant="outline" onClick={() => setAdjModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {cnModal && cnInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCnModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Issue Credit Note</h3>
            <p className="text-sm text-gray-500 mb-1">Invoice: <span className="font-mono font-medium">{cnInvoice.invoiceNumber}</span></p>
            <p className="text-sm text-gray-500 mb-4">Outstanding: <span className="font-medium text-red-600">{formatCurrency(cnInvoice.outstandingAmount)}</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Credit Amount (AED)</label>
                <input type="number" step="0.01" min="0" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. 1200.00" value={cnAmount} onChange={(e) => setCnAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Reason</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[70px]" placeholder="Reason for issuing credit note..." value={cnReason} onChange={(e) => setCnReason(e.target.value)} />
              </div>
              {cnMutation.isError && <p className="text-sm text-red-600">Failed to issue credit note. Please try again.</p>}
              {cnMutation.isSuccess && <p className="text-sm text-green-600">Credit note issued successfully.</p>}
            </div>
            <div className="flex gap-3 mt-4">
              <Button className="flex-1" disabled={!cnAmount || !cnReason} loading={cnMutation.isPending} onClick={() => cnMutation.mutate()}>
                <CreditCard className="h-4 w-4 mr-2" /> Issue Credit Note
              </Button>
              <Button variant="outline" onClick={() => setCnModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
