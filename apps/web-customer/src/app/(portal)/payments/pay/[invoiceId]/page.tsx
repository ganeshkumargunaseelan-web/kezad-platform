'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, Landmark, Shield, Lock,
  Loader2, CheckCircle2, Zap, Wind, Droplets, Snowflake,
} from 'lucide-react';
import {
  Card, CardContent, Badge, Button, formatCurrency, formatDate,
} from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';

type PaymentMethod = 'net_banking' | 'credit_card' | 'stripe';

interface Invoice {
  id: string;
  invoiceNumber: string;
  utilityType: string;
  status: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  vatAmount: string;
  subtotal: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  periodFrom: string;
  periodTo: string;
  contract?: { contractNumber: string; customer?: { companyName: string } };
}

const METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode; desc: string; tag?: string }[] = [
  { id: 'net_banking', label: 'Net Banking', icon: <Landmark className="h-6 w-6" />, desc: 'Pay directly from your bank account via secure internet banking', tag: 'Popular' },
  { id: 'credit_card', label: 'Credit / Debit Card', icon: <CreditCard className="h-6 w-6" />, desc: 'Visa, Mastercard, or American Express accepted' },
  { id: 'stripe', label: 'Stripe', icon: <Shield className="h-6 w-6" />, desc: 'Secure payment processing powered by Stripe' },
];

const UTILITY_ICONS: Record<string, React.ReactNode> = {
  GAS: <Wind className="h-5 w-5 text-white" />,
  POWER: <Zap className="h-5 w-5 text-white" />,
  WATER: <Droplets className="h-5 w-5 text-white" />,
  DISTRICT_COOLING: <Snowflake className="h-5 w-5 text-white" />,
};

const UTILITY_COLORS: Record<string, string> = {
  GAS: 'icon-amber', POWER: 'icon-blue', WATER: 'icon-teal', DISTRICT_COOLING: 'icon-purple',
};

const UTILITY_LABELS: Record<string, string> = {
  GAS: 'Gas', POWER: 'Power', WATER: 'Water', DISTRICT_COOLING: 'District Cooling',
};

export default function PaymentPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['pay-invoice', invoiceId],
    queryFn: () => api.get(`/billing/invoices/${invoiceId}`).then((r) => r.data.data as Invoice),
    enabled: !!invoiceId,
  });

  const initiateMutation = useMutation({
    mutationFn: (method: PaymentMethod) =>
      api.post('/billing/payments/initiate', { invoiceId, method }).then((r) => r.data),
    onSuccess: (data) => {
      setPaymentId(data.data.paymentId);
      setProcessing(true);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Payment initiation failed. Please try again.';
      setError(msg);
    },
  });

  // Poll payment status
  useEffect(() => {
    if (!processing || !paymentId) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/billing/payments/${paymentId}/status`);
        const status = data.data.status;
        if (status === 'COMPLETED') {
          clearInterval(interval);
          void qc.invalidateQueries({ queryKey: ['payment-invoices'] });
          void qc.invalidateQueries({ queryKey: ['invoices'] });
          void qc.invalidateQueries({ queryKey: ['contracts'] });
          void qc.invalidateQueries({ queryKey: ['dashboard-contracts'] });
          void qc.invalidateQueries({ queryKey: ['dashboard-invoices'] });
          router.push(`/payments/result?paymentId=${paymentId}&status=success`);
        } else if (status === 'FAILED') {
          clearInterval(interval);
          router.push(`/payments/result?paymentId=${paymentId}&status=failed&invoiceId=${invoiceId}`);
        }
      } catch {
        // continue polling
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [processing, paymentId, invoiceId, router, qc]);

  function handlePay() {
    if (!selectedMethod) return;
    setError(null);
    initiateMutation.mutate(selectedMethod);
  }

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Header title="Payment" subtitle="Processing your payment" />
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="animate-fade-in">
        <Header title="Payment" subtitle="Invoice not found" />
        <div className="p-8 text-center">
          <p className="text-gray-500">Invoice not found or you don't have access to it.</p>
          <Button className="mt-4" onClick={() => router.push('/payments')}>Back to Payments</Button>
        </div>
      </div>
    );
  }

  const outstanding = parseFloat(invoice.outstandingAmount);

  return (
    <div className="animate-fade-in">
      <Header title="Make Payment" subtitle={`Pay invoice ${invoice.invoiceNumber}`} />

      {/* Processing overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-sm w-full mx-4 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}>
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please wait while we process your payment of <span className="font-semibold">{formatCurrency(outstanding, invoice.currency)}</span>
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Lock className="h-3 w-3" />
              <span>Secured with 256-bit SSL encryption</span>
            </div>
            <div className="mt-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full animate-[shimmer_2s_ease-in-out_infinite]"
                style={{ background: 'linear-gradient(90deg, #0F766E 0%, #14B8A6 50%, #0F766E 100%)', backgroundSize: '200% 100%' }} />
            </div>
          </div>
        </div>
      )}

      <div className="p-8">
        <button onClick={() => router.push('/payments')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Payments
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-6xl">
          {/* Left — Invoice Summary */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${UTILITY_COLORS[invoice.utilityType] ?? 'icon-teal'}`}>
                      {UTILITY_ICONS[invoice.utilityType] ?? <Zap className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{UTILITY_LABELS[invoice.utilityType] ?? invoice.utilityType}</p>
                      <p className="text-sm font-bold text-gray-900 font-mono">{invoice.invoiceNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Period</span>
                      <span className="font-medium text-gray-800">{formatDate(invoice.periodFrom)} – {formatDate(invoice.periodTo)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Issue Date</span>
                      <span className="font-medium text-gray-800">{formatDate(invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Due Date</span>
                      <span className="font-medium text-red-600">{formatDate(invoice.dueDate)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-800">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">VAT (5%)</span>
                      <span className="text-gray-800">{formatCurrency(invoice.vatAmount, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Amount</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                    </div>
                    {parseFloat(invoice.paidAmount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Already Paid</span>
                        <span className="text-green-600">-{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t-2 border-primary/20 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Amount to Pay</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(outstanding, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right — Method Selection + Pay */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900">Select Payment Method</h3>
                  <p className="text-xs text-gray-400 mt-1">Choose how you'd like to pay</p>
                </div>
                <div className="p-6 space-y-3">
                  {METHODS.map((m) => {
                    const active = selectedMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMethod(m.id)}
                        disabled={processing}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          active
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {m.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                            {m.tag && <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">{m.tag}</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          active ? 'border-primary' : 'border-gray-300'
                        }`}>
                          {active && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              className="w-full py-6 text-base font-bold"
              disabled={!selectedMethod || processing || initiateMutation.isPending}
              onClick={handlePay}
              style={{ background: selectedMethod ? 'linear-gradient(135deg, #0F766E, #14B8A6)' : undefined }}
            >
              {initiateMutation.isPending ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Initiating Payment...</>
              ) : (
                <><Lock className="h-5 w-5 mr-2" /> Confirm & Pay {formatCurrency(outstanding, invoice.currency)}</>
              )}
            </Button>

            {/* Security indicators */}
            <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                <span>256-bit SSL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>PCI DSS Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Secure Gateway</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
