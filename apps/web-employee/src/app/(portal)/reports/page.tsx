'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, TrendingUp, PieChart, Shield, BarChart2, Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Button, StatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, statusVariant, formatCurrency, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type ReportType = 'ar-aging' | 'vat-compliance' | 'billing-summary' | 'usage' | 'kpi-dashboard';

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'kpi-dashboard',    label: 'KPI Dashboard',    icon: BarChart2,   description: 'Operational KPIs and live metrics' },
  { id: 'ar-aging',         label: 'AR Aging',         icon: PieChart,    description: 'Accounts receivable aging buckets (IFRS 9)' },
  { id: 'billing-summary',  label: 'Billing Summary',  icon: FileText,    description: 'Revenue by utility type and status' },
  { id: 'vat-compliance',   label: 'VAT Compliance',   icon: Shield,      description: 'UAE FTA compliance report' },
  { id: 'usage',            label: 'Usage Report',     icon: TrendingUp,  description: 'Consumption by meter and utility' },
];

const UTILITY_COLORS: Record<string, string> = {
  GAS: '#f97316', POWER: '#3b82f6', WATER: '#06b6d4', DISTRICT_COOLING: '#0ea5e9',
};

export default function ReportsPage() {
  const [selected, setSelected] = useState<ReportType>('kpi-dashboard');
  const [from, setFrom] = useState(() => new Date(Date.now() - 90 * 86400_000).toISOString().split('T')[0] ?? '');
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0] ?? '');

  const needsDateRange = !['ar-aging', 'kpi-dashboard'].includes(selected);

  const kpiQuery = useQuery({
    queryKey: ['report', 'kpi-dashboard'],
    queryFn: () => api.get('/reports/kpi-dashboard').then((r) => r.data.data as {
      totalCustomers: number; activeContracts: number; pendingInvoices: number;
      pendingWorkflows: number; openServiceRequests: number;
    }),
    enabled: selected === 'kpi-dashboard',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report', selected, from, to],
    queryFn: () => {
      if (selected === 'kpi-dashboard') return null;
      const params = selected === 'ar-aging' ? '' : `?from=${from}&to=${to}`;
      return api.get(`/reports/${selected}${params}`).then((r) => r.data.data);
    },
    enabled: selected !== 'kpi-dashboard',
  });

  function downloadCsv() {
    if (!data) return;
    const rows = Array.isArray(data) ? data : [data];
    if (!rows[0]) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map((r: Record<string, unknown>) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kezad-${selected}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Operational, financial, and regulatory reports</p>
        </div>
        {data && (
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        )}
      </div>

      <div className="p-8 space-y-6">
        {/* Report type selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            return (
              <button
                key={rt.id}
                onClick={() => setSelected(rt.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selected === rt.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-5 w-5 mb-2 ${selected === rt.id ? 'text-primary' : 'text-gray-400'}`} />
                <p className={`text-sm font-semibold ${selected === rt.id ? 'text-primary' : 'text-gray-700'}`}>{rt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{rt.description}</p>
              </button>
            );
          })}
        </div>

        {/* Date range + Run button */}
        {needsDateRange && (
          <div className="flex flex-wrap items-end gap-4 bg-white rounded-xl border p-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
              <input type="date" className="border rounded-lg px-3 py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
              <input type="date" className="border rounded-lg px-3 py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={() => void refetch()} loading={isLoading}>Run Report</Button>
          </div>
        )}

        {selected === 'ar-aging' && !data && (
          <Button onClick={() => void refetch()} loading={isLoading}>Run AR Aging Report</Button>
        )}

        {/* ── KPI DASHBOARD ─────────────────────────────────────── */}
        {selected === 'kpi-dashboard' && (
          kpiQuery.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1,2,3,4,5].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : kpiQuery.data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard
                  title="Active Customers"
                  value={kpiQuery.data.totalCustomers}
                  icon={<Users className="h-5 w-5" />}
                  variant="default"
                />
                <StatCard
                  title="Active Contracts"
                  value={kpiQuery.data.activeContracts}
                  icon={<FileText className="h-5 w-5" />}
                  variant="success"
                />
                <StatCard
                  title="Pending Invoices"
                  value={kpiQuery.data.pendingInvoices}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  variant={kpiQuery.data.pendingInvoices > 0 ? 'warning' : 'default'}
                />
                <StatCard
                  title="Pending Workflows"
                  value={kpiQuery.data.pendingWorkflows}
                  icon={<Clock className="h-5 w-5" />}
                  variant={kpiQuery.data.pendingWorkflows > 0 ? 'warning' : 'default'}
                />
                <StatCard
                  title="Open Service Requests"
                  value={kpiQuery.data.openServiceRequests}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  variant={kpiQuery.data.openServiceRequests > 0 ? 'warning' : 'default'}
                />
              </div>
              <Card>
                <CardContent className="py-5">
                  <p className="text-xs text-gray-500 text-center">
                    Live operational snapshot — data refreshes on page load. Use the other report types for historical trend analysis.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null
        )}

        {/* ── AR AGING ──────────────────────────────────────────── */}
        {selected === 'ar-aging' && data && Array.isArray(data) && (
          <Card>
            <CardHeader><CardTitle>Accounts Receivable Aging (IFRS 9)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Bar dataKey="outstandingAmount" name="Outstanding (AED)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {(data as { bucket: string; count: number; outstandingAmount: string }[]).map((b) => (
                  <div key={b.bucket} className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">{b.bucket}</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(b.outstandingAmount)}</p>
                    <p className="text-xs text-gray-400">{b.count} invoices</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── VAT COMPLIANCE ────────────────────────────────────── */}
        {selected === 'vat-compliance' && data && Array.isArray(data) && (
          <Card>
            <CardHeader><CardTitle>UAE VAT Compliance Report — {from} to {to}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>VAT Reg No</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">VAT %</TableHead>
                    <TableHead className="text-right">VAT Amount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data as {
                    invoiceNumber: string;
                    contract: { customer: { companyName: string; vatRegistrationNo: string } };
                    issueDate: string; subtotal: string; vatPct: string; vatAmount: string; totalAmount: string;
                  }[]).map((inv) => (
                    <TableRow key={inv.invoiceNumber}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.contract?.customer?.companyName}</TableCell>
                      <TableCell className="font-mono text-xs">{inv.contract?.customer?.vatRegistrationNo ?? '—'}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.issueDate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.subtotal)}</TableCell>
                      <TableCell className="text-right">{inv.vatPct}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.vatAmount)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(inv.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── BILLING SUMMARY ───────────────────────────────────── */}
        {selected === 'billing-summary' && data && Array.isArray(data) && (
          <Card>
            <CardHeader><CardTitle>Billing Revenue Summary — {from} to {to}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={
                  (() => {
                    const grouped: Record<string, { utilityType: string; totalBilled: number; totalPaid: number }> = {};
                    (data as { utilityType: string; status: string; _sum: { totalAmount: string | null; paidAmount: string | null }; _count: number }[]).forEach((row) => {
                      const ut = row.utilityType;
                      if (!grouped[ut]) grouped[ut] = { utilityType: ut, totalBilled: 0, totalPaid: 0 };
                      grouped[ut]!.totalBilled += parseFloat(row._sum?.totalAmount ?? '0');
                      grouped[ut]!.totalPaid += parseFloat(row._sum?.paidAmount ?? '0');
                    });
                    return Object.values(grouped);
                  })()
                }>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="utilityType" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Legend />
                  <Bar dataKey="totalBilled" name="Total Billed (AED)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalPaid" name="Total Collected (AED)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utility</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Total Billed</TableHead>
                      <TableHead className="text-right">Total Collected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data as { utilityType: string; status: string; _count: number; _sum: { totalAmount: string | null; paidAmount: string | null } }[]).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.utilityType.replace('_', ' ')}</TableCell>
                        <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
                        <TableCell className="text-right">{row._count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row._sum?.totalAmount ?? '0')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row._sum?.paidAmount ?? '0')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── USAGE REPORT ──────────────────────────────────────── */}
        {selected === 'usage' && data && Array.isArray(data) && (
          <Card>
            <CardHeader><CardTitle>Consumption Usage Report — {from} to {to}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meter ID</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Total Consumption</TableHead>
                    <TableHead className="text-right">Readings Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data as { meterId: string; unit: string; _sum: { rawValue: string | null }; _count: number }[]).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{row.meterId.slice(0, 16)}...</TableCell>
                      <TableCell><Badge variant="secondary">{row.unit}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">
                        {parseFloat(row._sum?.rawValue ?? '0').toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">{row._count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.length === 0 && (
                <div className="text-center py-12">
                  <TrendingUp className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No consumption data for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
