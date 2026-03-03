'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, Filter } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, statusVariant,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, Input, formatCurrency, formatDate,
} from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { StatCard } from '@kezad/ui';
import { api } from '@/lib/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  utilityType: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  issueDate: string;
  dueDate: string;
  periodFrom: string;
  periodTo: string;
}

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading } = useQuery<{ data: Invoice[] }>({
    queryKey: ['invoices'],
    queryFn: () => api.get('/billing/invoices').then((r) => r.data),
  });

  const invoices = data?.data ?? [];
  const filtered = invoices.filter((inv) => {
    const matchSearch = !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.utilityType.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + parseFloat(i.totalAmount), 0);
  const totalOutstanding = invoices.filter((i) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status))
    .reduce((s, i) => s + parseFloat(i.outstandingAmount ?? '0'), 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  async function downloadPdf(invoiceId: string, invoiceNumber: string) {
    const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <Header title="Billing & Invoices" subtitle="View your invoice history and payment status" />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Paid (YTD)" value={formatCurrency(totalPaid)} variant="success" />
          <StatCard title="Outstanding Balance" value={formatCurrency(totalOutstanding)} variant={totalOutstanding > 0 ? 'warning' : 'default'} />
          <StatCard title="Overdue Invoices" value={overdueCount} variant={overdueCount > 0 ? 'danger' : 'default'} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Search invoices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Utility</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.utilityType}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {formatDate(inv.periodFrom)} – {formatDate(inv.periodTo)}
                      </TableCell>
                      <TableCell>{formatDate(inv.issueDate)}</TableCell>
                      <TableCell className={inv.status === 'OVERDUE' ? 'text-red-600 font-medium' : ''}>
                        {formatDate(inv.dueDate)}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                      <TableCell>{parseFloat(inv.outstandingAmount ?? '0') > 0 ? formatCurrency(inv.outstandingAmount) : '—'}</TableCell>
                      <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No invoices match your filters.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
