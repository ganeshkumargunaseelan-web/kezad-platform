'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, Filter, AlertCircle } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, formatCurrency, formatDate, Modal, ModalFooter,
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

// Customer-friendly display labels
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Pending Payment',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  PARTIALLY_PAID: 'Partially Paid',
  DISPUTED: 'Under Dispute',
  CANCELLED: 'Cancelled',
  VOID: 'Void',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'default' | 'outline'> = {
  DRAFT: 'secondary',
  SENT: 'warning',
  PAID: 'success',
  OVERDUE: 'destructive',
  PARTIALLY_PAID: 'warning',
  DISPUTED: 'destructive',
  CANCELLED: 'secondary',
  VOID: 'secondary',
};

const UTILITY_LABELS: Record<string, string> = {
  GAS: 'Gas',
  POWER: 'Power',
  WATER: 'Water',
  DISTRICT_COOLING: 'District Cooling',
};

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [disputeInvoice, setDisputeInvoice] = useState<Invoice | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const qc = useQueryClient();

  const { data: rawInvoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/billing/invoices').then((r) => r.data.data),
  });
  const invoices = Array.isArray(rawInvoices) ? (rawInvoices as Invoice[]) : [];

  const disputeMutation = useMutation({
    mutationFn: (body: { contractId?: string; requestType: string; subject: string; description: string }) =>
      api.post('/service-requests', body),
    onSuccess: () => {
      setDisputeInvoice(null);
      setDisputeReason('');
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const filtered = invoices.filter((inv) => {
    const label = STATUS_LABELS[inv.status] ?? inv.status;
    const utilLabel = UTILITY_LABELS[inv.utilityType] ?? inv.utilityType;
    const matchSearch = !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      utilLabel.toLowerCase().includes(search.toLowerCase()) ||
      label.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + parseFloat(i.totalAmount), 0);
  const totalOutstanding = invoices.filter((i) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status))
    .reduce((s, i) => s + parseFloat(i.outstandingAmount ?? '0'), 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  async function viewInvoice(invoiceId: string) {
    const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: 'text' });
    const blob = new Blob([res.data as string], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  function handleDispute() {
    if (!disputeInvoice || !disputeReason.trim()) return;
    disputeMutation.mutate({
      requestType: 'BILLING_DISPUTE',
      subject: `Dispute: Invoice ${disputeInvoice.invoiceNumber}`,
      description: `Invoice: ${disputeInvoice.invoiceNumber}\nAmount: AED ${disputeInvoice.totalAmount}\nPeriod: ${disputeInvoice.periodFrom} to ${disputeInvoice.periodTo}\n\nReason: ${disputeReason}`,
    });
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
                  <option value="SENT">Pending Payment</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="DISPUTED">Under Dispute</option>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{UTILITY_LABELS[inv.utilityType] ?? inv.utilityType}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {formatDate(inv.periodFrom)} – {formatDate(inv.periodTo)}
                      </TableCell>
                      <TableCell>{formatDate(inv.issueDate)}</TableCell>
                      <TableCell className={inv.status === 'OVERDUE' ? 'text-red-600 font-medium' : ''}>
                        {formatDate(inv.dueDate)}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                      <TableCell>{parseFloat(inv.outstandingAmount ?? '0') > 0 ? formatCurrency(inv.outstandingAmount) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[inv.status] ?? 'default'}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewInvoice(inv.id)}
                            title="View Invoice PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(inv.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDisputeInvoice(inv)}
                              title="Raise Dispute"
                              className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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

      {/* Dispute Modal */}
      <Modal open={!!disputeInvoice} onClose={() => { setDisputeInvoice(null); setDisputeReason(''); }}
        title="Raise Billing Dispute">
        {disputeInvoice && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 space-y-1 text-sm">
              <p><span className="text-gray-500">Invoice:</span> <span className="font-semibold">{disputeInvoice.invoiceNumber}</span></p>
              <p><span className="text-gray-500">Utility:</span> {UTILITY_LABELS[disputeInvoice.utilityType] ?? disputeInvoice.utilityType}</p>
              <p><span className="text-gray-500">Amount:</span> <span className="font-semibold">{formatCurrency(disputeInvoice.totalAmount)}</span></p>
              <p><span className="text-gray-500">Period:</span> {formatDate(disputeInvoice.periodFrom)} – {formatDate(disputeInvoice.periodTo)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Dispute *</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[100px]"
                placeholder="Please describe why you are disputing this invoice (e.g., incorrect meter reading, wrong tariff applied, billing period error)..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
              />
            </div>
            {disputeMutation.isError && (
              <p className="text-sm text-red-600">Failed to submit dispute. Please try again.</p>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => { setDisputeInvoice(null); setDisputeReason(''); }}>Cancel</Button>
          <Button
            onClick={handleDispute}
            disabled={!disputeReason.trim() || disputeMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {disputeMutation.isPending ? 'Submitting...' : 'Submit Dispute'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
