'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, TrendingUp, PieChart, Shield, BarChart2, Users, CheckCircle2, Clock, AlertTriangle, Inbox } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Button, StatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, statusVariant, formatCurrency, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart as RPieChart, Pie, Cell,
} from 'recharts';

type ReportType = 'ar-aging' | 'vat-compliance' | 'billing-summary' | 'usage' | 'kpi-dashboard';

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'kpi-dashboard',    label: 'KPI Dashboard',    icon: BarChart2,   description: 'Operational KPIs and live metrics' },
  { id: 'ar-aging',         label: 'AR Aging',         icon: PieChart,    description: 'Accounts receivable aging (IFRS 9)' },
  { id: 'billing-summary',  label: 'Billing Summary',  icon: FileText,    description: 'Revenue by utility type and status' },
  { id: 'vat-compliance',   label: 'VAT Compliance',   icon: Shield,      description: 'UAE FTA compliance report' },
  { id: 'usage',            label: 'Usage Report',     icon: TrendingUp,  description: 'Consumption by meter and utility' },
];

const AR_COLORS = ['#006B6B', '#E8A020', '#f97316', '#ef4444'];

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
      <div className="kezad-page-header">
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
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-gray-200 bg-white hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${selected === rt.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className={`text-sm font-semibold ${selected === rt.id ? 'text-primary' : 'text-gray-700'}`}>{rt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{rt.description}</p>
              </button>
            );
          })}
        </div>

        {/* Date range */}
        {needsDateRange && (
          <div className="flex flex-wrap items-end gap-4 bg-white rounded-xl border p-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={() => void refetch()} loading={isLoading}>Refresh</Button>
          </div>
        )}

        {/* Loading state for non-KPI reports */}
        {selected !== 'kpi-dashboard' && isLoading && (
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Loading report data...</p>
              </div>
            </CardContent>
          </Card>
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
                <StatCard title="Active Customers" value={kpiQuery.data.totalCustomers} icon={<Users className="h-5 w-5" />} variant="default" />
                <StatCard title="Active Contracts" value={kpiQuery.data.activeContracts} icon={<FileText className="h-5 w-5" />} variant="success" />
                <StatCard title="Pending Invoices" value={kpiQuery.data.pendingInvoices} icon={<AlertTriangle className="h-5 w-5" />} variant={kpiQuery.data.pendingInvoices > 0 ? 'warning' : 'default'} />
                <StatCard title="Pending Workflows" value={kpiQuery.data.pendingWorkflows} icon={<Clock className="h-5 w-5" />} variant={kpiQuery.data.pendingWorkflows > 0 ? 'warning' : 'default'} />
                <StatCard title="Open Service Requests" value={kpiQuery.data.openServiceRequests} icon={<CheckCircle2 className="h-5 w-5" />} variant={kpiQuery.data.openServiceRequests > 0 ? 'warning' : 'default'} />
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
        {selected === 'ar-aging' && !isLoading && data && Array.isArray(data) && (
          <Card>
            <CardHeader><CardTitle>Accounts Receivable Aging (IFRS 9)</CardTitle></CardHeader>
            <CardContent>
              {data.length === 0 || data.every((b: { outstandingAmount: string }) => parseFloat(b.outstandingAmount) === 0) ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                  </div>
                  <p className="font-medium text-gray-700">No Outstanding Receivables</p>
                  <p className="text-sm text-gray-400 mt-1">All invoices are paid or not yet due</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                        <Bar dataKey="outstandingAmount" name="Outstanding (AED)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height={250}>
                      <RPieChart>
                        <Pie
                          data={(data as { bucket: string; outstandingAmount: string }[]).map((b) => ({ name: b.bucket, value: parseFloat(b.outstandingAmount) }))}
                          cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                        >
                          {data.map((_: unknown, i: number) => <Cell key={i} fill={AR_COLORS[i % AR_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(data as { bucket: string; count: number; outstandingAmount: string }[]).map((b, i) => (
                      <div key={b.bucket} className="text-center p-4 rounded-xl border" style={{ borderLeftWidth: 3, borderLeftColor: AR_COLORS[i % AR_COLORS.length] }}>
                        <p className="text-xs text-gray-500 font-medium">{b.bucket}</p>
                        <p className="text-xl font-bold mt-1 text-gray-900">{formatCurrency(b.outstandingAmount)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{b.count} invoice{b.count !== 1 ? 's' : ''}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── VAT COMPLIANCE ────────────────────────────────────── */}
        {selected === 'vat-compliance' && !isLoading && data && Array.isArray(data) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>UAE VAT Compliance Report — {from} to {to}</CardTitle>
                {data.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Total VAT: <span className="font-bold text-gray-900">{formatCurrency(data.reduce((s: number, inv: { vatAmount: string }) => s + parseFloat(inv.vatAmount ?? '0'), 0))}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No invoices found for this period</p>
                  <p className="text-sm text-gray-400 mt-1">Adjust the date range to find VAT records</p>
                </div>
              ) : (
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
                        <TableCell className="font-mono text-xs font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-sm">{inv.contract?.customer?.companyName}</TableCell>
                        <TableCell className="font-mono text-xs">{inv.contract?.customer?.vatRegistrationNo ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.subtotal)}</TableCell>
                        <TableCell className="text-right">{inv.vatPct}%</TableCell>
                        <TableCell className="text-right font-medium text-amber-700">{formatCurrency(inv.vatAmount)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(inv.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── BILLING SUMMARY ───────────────────────────────────── */}
        {selected === 'billing-summary' && !isLoading && data && Array.isArray(data) && (
          <Card>
            <CardHeader><CardTitle>Billing Revenue Summary — {from} to {to}</CardTitle></CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No billing data for this period</p>
                  <p className="text-sm text-gray-400 mt-1">Adjust the date range to find billing records</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={
                      (() => {
                        const grouped: Record<string, { utilityType: string; totalBilled: number; totalPaid: number }> = {};
                        (data as { utilityType: string; status: string; _sum: { totalAmount: string | null; paidAmount: string | null }; _count: number }[]).forEach((row) => {
                          const ut = row.utilityType;
                          if (!grouped[ut]) grouped[ut] = { utilityType: ut === 'DISTRICT_COOLING' ? 'Cooling' : ut, totalBilled: 0, totalPaid: 0 };
                          grouped[ut]!.totalBilled += parseFloat(row._sum?.totalAmount ?? '0');
                          grouped[ut]!.totalPaid += parseFloat(row._sum?.paidAmount ?? '0');
                        });
                        return Object.values(grouped);
                      })()
                    }>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="utilityType" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="totalBilled" name="Total Billed (AED)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="totalPaid" name="Total Collected (AED)" fill="#22c55e" radius={[6, 6, 0, 0]} />
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
                            <TableCell className="text-right font-medium">{formatCurrency(row._sum?.totalAmount ?? '0')}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row._sum?.paidAmount ?? '0')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── USAGE REPORT ──────────────────────────────────────── */}
        {selected === 'usage' && !isLoading && data && Array.isArray(data) && (
          <Card>
            <CardHeader><CardTitle>Consumption Usage Report — {from} to {to}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No consumption data for this period</p>
                  <p className="text-sm text-gray-400 mt-1">Generate SCADA data from the Meters page first</p>
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty state when no report selected shows nothing */}
        {selected !== 'kpi-dashboard' && !isLoading && !data && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Inbox className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Select date range and click Refresh</p>
                <p className="text-sm text-gray-400 mt-1">Report data will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
