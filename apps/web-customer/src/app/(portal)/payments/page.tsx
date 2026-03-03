'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Receipt, CheckCircle2, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, StatCard, Badge, statusVariant,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, formatCurrency, formatDate,
} from '@kezad/ui';
import { Header } from '@/components/layout/header';
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
  currency: string;
}

export default function PaymentsPage() {
  const { data, isLoading } = useQuery<{ data: Invoice[] }>({
    queryKey: ['payment-invoices'],
    queryFn: () => api.get('/billing/invoices?limit=50').then((r) => r.data),
  });

  const invoices = data?.data ?? [];
  const outstanding = invoices.filter((i) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status));
  const paid = invoices.filter((i) => i.status === 'PAID');
  const totalOutstanding = outstanding.reduce((s, i) => s + parseFloat(i.outstandingAmount), 0);
  const totalPaid = paid.reduce((s, i) => s + parseFloat(i.paidAmount), 0);

  return (
    <div className="animate-fade-in">
      <Header title="Payments" subtitle="View your payment history and outstanding balances" />

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Outstanding Balance" value={formatCurrency(totalOutstanding)} subtitle="AED" icon={<AlertTriangle className="h-5 w-5" />} variant={totalOutstanding > 0 ? 'warning' : 'default'} />
          <StatCard title="Total Paid" value={formatCurrency(totalPaid)} subtitle="AED" icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
          <StatCard title="Unpaid Invoices" value={outstanding.length} subtitle="Pending settlement" icon={<Clock className="h-5 w-5" />} variant={outstanding.length > 0 ? 'warning' : 'default'} />
          <StatCard title="Paid Invoices" value={paid.length} subtitle="Completed" icon={<CreditCard className="h-5 w-5" />} />
        </div>

        {/* Outstanding Invoices */}
        {outstanding.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader className="px-6 py-4 border-b border-amber-100 bg-amber-50/50">
              <CardTitle className="text-base text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Outstanding Invoices ({outstanding.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Utility</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstanding.map((inv) => (
                    <TableRow key={inv.id} className={inv.status === 'OVERDUE' ? 'bg-red-50/30' : ''}>
                      <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.utilityType.replace('_', ' ')}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(inv.totalAmount), inv.currency)}</TableCell>
                      <TableCell className="font-semibold text-red-600">{formatCurrency(Number(inv.outstandingAmount), inv.currency)}</TableCell>
                      <TableCell className={`text-xs ${inv.status === 'OVERDUE' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{formatDate(inv.dueDate)}</TableCell>
                      <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <CardTitle className="text-base">Payment History</CardTitle>
            <a href="/billing" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all invoices <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !paid.length ? (
              <div className="text-center py-12">
                <Receipt className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No payment history yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Utility</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paid.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.utilityType.replace('_', ' ')}</TableCell>
                      <TableCell className="font-medium text-green-600">{formatCurrency(Number(inv.paidAmount), inv.currency)}</TableCell>
                      <TableCell className="text-xs text-gray-400">{formatDate(inv.issueDate)}</TableCell>
                      <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
