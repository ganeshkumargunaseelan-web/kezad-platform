'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, FileText, Receipt, GitBranch, AlertTriangle, Wind, Zap, Droplets, Snowflake } from 'lucide-react';
import { StatCard, Card, CardContent, CardHeader, CardTitle, formatCurrency } from '@kezad/ui';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

interface KpiData { totalCustomers: number; activeContracts: number; pendingInvoices: number; pendingWorkflows: number; openServiceRequests: number; }
interface ArBucket { bucket: string; count: number; outstandingAmount: string; }

const AR_COLORS = ['#006B6B', '#E8A020', '#f97316', '#ef4444'];
const UTILITY_ICON_CLASS: Record<string, string> = {
  GAS: 'icon-amber', POWER: 'icon-blue', WATER: 'icon-teal', DISTRICT_COOLING: 'icon-purple',
};

export default function DashboardPage() {
  const { data: kpi } = useQuery<KpiData>({
    queryKey: ['kpi'],
    queryFn: () => api.get('/reports/kpi-dashboard').then((r) => r.data.data as KpiData),
    refetchInterval: 60_000,
  });
  const { data: arAging } = useQuery<ArBucket[]>({
    queryKey: ['ar-aging'],
    queryFn: () => api.get('/reports/ar-aging').then((r) => r.data.data as ArBucket[]),
  });
  const { data: billingSummary } = useQuery({
    queryKey: ['billing-summary'],
    queryFn: () => {
      const to = new Date().toISOString();
      const from = new Date(Date.now() - 90 * 86400_000).toISOString();
      return api.get(`/reports/billing-summary?from=${from}&to=${to}`).then((r) => r.data.data as Array<{ utilityType: string; status: string; _sum: { totalAmount: string }; _count: number }>);
    },
  });

  const billingByUtility = (['GAS', 'POWER', 'WATER', 'DISTRICT_COOLING'] as const).map((ut) => {
    const records = (billingSummary ?? []).filter((r) => r.utilityType === ut);
    const total = records.reduce((s, r) => s + parseFloat(r._sum.totalAmount ?? '0'), 0);
    const paid = (billingSummary ?? []).filter((r) => r.utilityType === ut && r.status === 'PAID').reduce((s, r) => s + parseFloat(r._sum.totalAmount ?? '0'), 0);
    return { name: ut === 'DISTRICT_COOLING' ? 'Cooling' : ut, Billed: total, Collected: paid };
  });
  const arPieData = arAging?.map((b) => ({ name: b.bucket, value: parseFloat(b.outstandingAmount) })) ?? [];

  const utilityIcons: Record<string, React.ReactNode> = {
    GAS: <Wind className="h-5 w-5 text-white" />,
    POWER: <Zap className="h-5 w-5 text-white" />,
    WATER: <Droplets className="h-5 w-5 text-white" />,
    DISTRICT_COOLING: <Snowflake className="h-5 w-5 text-white" />,
  };

  return (
    <div className="animate-fade-in">
      {/* Premium header */}
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">KPI Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Live operational overview · Updated every 60 seconds</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          System Online
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* KPI stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Customers"   value={kpi?.totalCustomers ?? '—'}      icon={<Users className="h-5 w-5 text-white" />} />
          <StatCard title="Active Contracts"  value={kpi?.activeContracts ?? '—'}     icon={<FileText className="h-5 w-5 text-white" />} variant="success" />
          <StatCard title="Pending Invoices"  value={kpi?.pendingInvoices ?? '—'}     icon={<Receipt className="h-5 w-5 text-white" />} variant={kpi?.pendingInvoices ? 'warning' : 'default'} />
          <StatCard title="Pending Approvals" value={kpi?.pendingWorkflows ?? '—'}    icon={<GitBranch className="h-5 w-5 text-white" />} variant={kpi?.pendingWorkflows ? 'warning' : 'default'} />
          <StatCard title="Open Requests"     value={kpi?.openServiceRequests ?? '—'} icon={<AlertTriangle className="h-5 w-5 text-white" />} variant={kpi?.openServiceRequests ? 'danger' : 'default'} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle>Revenue by Utility — Last 90 Days</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={billingByUtility} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Billed"    fill="#006B6B" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Collected" fill="#E8A020" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle>AR Aging</CardTitle></CardHeader>
            <CardContent>
              {arPieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={arPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                        {arPieData.map((_, i) => <Cell key={i} fill={AR_COLORS[i % AR_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {arAging?.map((b, i) => (
                      <div key={b.bucket} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AR_COLORS[i % AR_COLORS.length] }} />
                          <span className="text-xs text-gray-500">{b.bucket}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-800">{formatCurrency(b.outstandingAmount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="w-12 h-12 rounded-2xl icon-green flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No outstanding AR</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Utility revenue breakdown cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['GAS', 'POWER', 'WATER', 'DISTRICT_COOLING'] as const).map((ut) => {
            const records = (billingSummary ?? []).filter((r) => r.utilityType === ut);
            const total = records.reduce((s, r) => s + parseFloat(r._sum.totalAmount ?? '0'), 0);
            const count = records.reduce((s, r) => s + r._count, 0);
            return (
              <div key={ut} className="kezad-stat-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${UTILITY_ICON_CLASS[ut]}`}>
                    {utilityIcons[ut]}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{ut.replace('_', ' ')}</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
                <p className="text-xs text-gray-400 mt-1">{count} invoice{count !== 1 ? 's' : ''} · 90 days</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
