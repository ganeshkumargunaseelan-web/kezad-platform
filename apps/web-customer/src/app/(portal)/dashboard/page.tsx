'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, FileText, Receipt, AlertTriangle, TrendingUp, Zap, Droplets, Wind, Snowflake, CreditCard, MessageSquarePlus, ChevronRight } from 'lucide-react';
import { StatCard, Card, CardContent, CardHeader, CardTitle, Badge, statusVariant, formatCurrency, formatDate } from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';

interface Contract { id: string; contractNumber: string; utilityType: string; status: string; startDate: string; }
interface Invoice { id: string; invoiceNumber: string; status: string; totalAmount: string; outstandingAmount: string; dueDate: string; utilityType: string; currency: string; }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SENT: 'Pending Payment', PAID: 'Paid', OVERDUE: 'Overdue',
  PARTIALLY_PAID: 'Partially Paid', DISPUTED: 'Under Dispute', CANCELLED: 'Cancelled',
};

const UTILITY_META: Record<string, { icon: React.ReactNode; iconClass: string; label: string }> = {
  GAS:              { icon: <Wind className="h-5 w-5 text-white" />,      iconClass: 'icon-amber',  label: 'Gas' },
  POWER:            { icon: <Zap className="h-5 w-5 text-white" />,       iconClass: 'icon-blue',   label: 'Power' },
  WATER:            { icon: <Droplets className="h-5 w-5 text-white" />,  iconClass: 'icon-teal',   label: 'Water' },
  DISTRICT_COOLING: { icon: <Snowflake className="h-5 w-5 text-white" />, iconClass: 'icon-purple', label: 'Cooling' },
};

export default function DashboardPage() {
  const contractsQuery = useQuery({
    queryKey: ['dashboard-contracts'],
    queryFn: () => api.get('/contracts'),
  });
  const invoicesQuery = useQuery({
    queryKey: ['dashboard-invoices'],
    queryFn: () => api.get('/billing/invoices?limit=5'),
  });

  // Safely extract arrays — handle any response shape
  const contracts: Contract[] = (() => {
    try {
      const raw = contractsQuery.data;
      if (!raw) return [];
      const d = raw.data?.data ?? raw.data;
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  })();
  const invoices: Invoice[] = (() => {
    try {
      const raw = invoicesQuery.data;
      if (!raw) return [];
      const d = raw.data?.data ?? raw.data;
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  })();

  const activeContracts  = contracts.filter((c) => c.status === 'ACTIVE');
  const pendingInvoices  = invoices.filter((i) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status));
  const overdueInvoices  = invoices.filter((i) => i.status === 'OVERDUE');
  const totalOutstanding = pendingInvoices.reduce((sum, i) => sum + parseFloat(i.outstandingAmount ?? i.totalAmount), 0);

  const quickActions = [
    { href: '/billing',          label: 'Pay Outstanding Balance', sub: 'View and settle invoices',       iconClass: 'icon-blue',   icon: <CreditCard className="h-4 w-4 text-white" /> },
    { href: '/service-requests', label: 'Submit Service Request',  sub: 'Connection, query or complaint', iconClass: 'icon-green',  icon: <MessageSquarePlus className="h-4 w-4 text-white" /> },
    { href: '/consumption',      label: 'View Consumption',        sub: 'Meter readings & usage',         iconClass: 'icon-teal',   icon: <BarChart3 className="h-4 w-4 text-white" /> },
    { href: '/contracts',        label: 'View Contracts',          sub: 'Terms, rates and details',       iconClass: 'icon-amber',  icon: <FileText className="h-4 w-4 text-white" /> },
  ];

  return (
    <div className="animate-fade-in">
      <Header title="Dashboard" subtitle="Welcome back — here's your utilities overview" />
      <div className="p-8 space-y-6">

        {/* Overdue alert — premium */}
        {overdueInvoices.length > 0 && (
          <div className="flex items-center gap-4 rounded-2xl px-5 py-4 border border-red-200"
            style={{ background: 'linear-gradient(135deg, #FFF5F5, #FEE2E2)' }}>
            <div className="w-10 h-10 rounded-xl icon-red flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">
                {overdueInvoices.length} overdue {overdueInvoices.length === 1 ? 'invoice' : 'invoices'} require immediate attention
              </p>
              <p className="text-xs text-red-600 mt-0.5">Outstanding: <span className="font-semibold">{formatCurrency(totalOutstanding)}</span></p>
            </div>
            <a href="/billing" className="text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
              View Invoices →
            </a>
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Contracts"  value={activeContracts.length}   subtitle="All utility types" icon={<FileText className="h-5 w-5 text-white" />}  variant="success" />
          <StatCard title="Pending Invoices"  value={pendingInvoices.length}   subtitle="Awaiting payment"  icon={<Receipt className="h-5 w-5 text-white" />}   variant={pendingInvoices.length > 0 ? 'warning' : 'default'} />
          <StatCard title="Total Outstanding" value={formatCurrency(totalOutstanding)} subtitle="AED payable" icon={<TrendingUp className="h-5 w-5 text-white" />} variant={overdueInvoices.length > 0 ? 'danger' : 'default'} />
          <StatCard title="Active Utilities"  value={[...new Set(activeContracts.map((c) => c.utilityType))].length} subtitle="Types of service" icon={<BarChart3 className="h-5 w-5 text-white" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active contracts */}
          <Card className="lg:col-span-2" hover>
            <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-50">
              <CardTitle>Active Contracts</CardTitle>
              <a href="/contracts" className="text-xs font-semibold text-primary bg-primary/8 px-3 py-1.5 rounded-lg">View all →</a>
            </CardHeader>
            <CardContent className="p-0">
              {activeContracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-14 h-14 rounded-2xl icon-teal flex items-center justify-center"><FileText className="h-6 w-6 text-white" /></div>
                  <p className="text-sm font-medium text-gray-400">No active contracts</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {activeContracts.map((c) => {
                    const meta = UTILITY_META[c.utilityType] ?? UTILITY_META.POWER;
                    return (
                      <a key={c.id} href={`/contracts/${c.id}`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconClass}`}>{meta.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{c.contractNumber}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{meta.label} · Active since {formatDate(c.startDate)}</p>
                        </div>
                        <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                      </a>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card hover>
            <CardHeader className="px-6 py-4 border-b border-gray-50"><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-2">
              {quickActions.map((action) => (
                <a key={action.href} href={action.href}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-primary/4 transition-all group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${action.iconClass}`}>{action.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-400">{action.sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent invoices */}
        <Card hover>
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-50">
            <CardTitle>Recent Invoices</CardTitle>
            <a href="/billing" className="text-xs font-semibold text-primary bg-primary/8 px-3 py-1.5 rounded-lg">View all →</a>
          </CardHeader>
          <CardContent className="p-0">
            {!invoices.length ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl icon-teal flex items-center justify-center"><Receipt className="h-6 w-6 text-white" /></div>
                <p className="text-sm font-medium text-gray-400">No invoices yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${inv.status === 'OVERDUE' ? 'icon-red' : 'icon-teal'}`}>
                      {inv.status === 'OVERDUE' ? <AlertTriangle className="h-4 w-4 text-white" /> : <Receipt className="h-4 w-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{inv.utilityType === 'DISTRICT_COOLING' ? 'District Cooling' : inv.utilityType.charAt(0) + inv.utilityType.slice(1).toLowerCase()} · Due {formatDate(inv.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(inv.totalAmount), inv.currency)}</p>
                      {parseFloat(inv.outstandingAmount) > 0 && (
                        <p className="text-xs text-red-500 mt-0.5">{formatCurrency(Number(inv.outstandingAmount), inv.currency)} outstanding</p>
                      )}
                    </div>
                    <Badge variant={statusVariant(inv.status)}>{STATUS_LABELS[inv.status] ?? inv.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
