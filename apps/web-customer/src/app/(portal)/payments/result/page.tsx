'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, ArrowLeft, Receipt, CreditCard,
  Landmark, Shield, Calendar, Hash, Banknote,
} from 'lucide-react';
import { Card, CardContent, Button, formatCurrency } from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';

const METHOD_LABELS: Record<string, string> = {
  net_banking: 'Net Banking',
  credit_card: 'Credit / Debit Card',
  stripe: 'Stripe',
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  net_banking: <Landmark className="h-4 w-4" />,
  credit_card: <CreditCard className="h-4 w-4" />,
  stripe: <Shield className="h-4 w-4" />,
};

function PaymentResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const paymentId = params.get('paymentId');
  const status = params.get('status');
  const invoiceId = params.get('invoiceId');
  const isSuccess = status === 'success';

  const { data: payment } = useQuery({
    queryKey: ['payment-result', paymentId],
    queryFn: () => api.get(`/billing/payments/${paymentId}/status`).then((r) => r.data.data as {
      paymentId: string; paymentRef: string; status: string; amount: string;
      currency: string; method: string; paidAt: string | null;
      invoiceNumber?: string; invoiceStatus?: string;
      errorCode?: string; errorMessage?: string;
    }),
    enabled: !!paymentId,
  });

  return (
    <div className="animate-fade-in">
      <Header
        title={isSuccess ? 'Payment Successful' : 'Payment Failed'}
        subtitle={isSuccess ? 'Your payment has been processed' : 'Something went wrong'}
      />

      <div className="p-8 flex justify-center">
        <div className="max-w-lg w-full space-y-6">
          {/* Status Icon */}
          <div className="text-center">
            {isSuccess ? (
              <div className="animate-bounce-in">
                <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
                <p className="text-gray-500 mt-2">
                  Your payment of <span className="font-bold text-primary">{payment ? formatCurrency(payment.amount, payment.currency) : '...'}</span> has been received.
                </p>
              </div>
            ) : (
              <div className="animate-bounce-in">
                <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                  <XCircle className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
                <p className="text-gray-500 mt-2">
                  {payment?.errorMessage ?? 'Your payment could not be processed. Please try again.'}
                </p>
              </div>
            )}
          </div>

          {/* Payment Details */}
          {payment && (
            <Card>
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-sm font-semibold text-gray-700">Payment Details</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Hash className="h-4 w-4" /> Reference
                    </div>
                    <span className="text-sm font-mono font-semibold text-gray-900">{payment.paymentRef}</span>
                  </div>
                  {payment.invoiceNumber && (
                    <div className="px-6 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Receipt className="h-4 w-4" /> Invoice
                      </div>
                      <span className="text-sm font-mono font-semibold text-gray-900">{payment.invoiceNumber}</span>
                    </div>
                  )}
                  <div className="px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Banknote className="h-4 w-4" /> Amount
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount, payment.currency)}</span>
                  </div>
                  <div className="px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {METHOD_ICONS[payment.method] ?? <CreditCard className="h-4 w-4" />} Method
                    </div>
                    <span className="text-sm font-medium text-gray-800">{METHOD_LABELS[payment.method] ?? payment.method}</span>
                  </div>
                  {payment.paidAt && (
                    <div className="px-6 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" /> Date & Time
                      </div>
                      <span className="text-sm text-gray-800">
                        {new Date(payment.paidAt).toLocaleString('en-AE', {
                          dateStyle: 'medium', timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  )}
                  <div className="px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CheckCircle2 className="h-4 w-4" /> Status
                    </div>
                    <span className={`text-sm font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isSuccess ? (
              <>
                <Button className="flex-1" onClick={() => router.push('/billing')}>
                  <Receipt className="h-4 w-4 mr-2" /> View Invoices
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push('/payments')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payments
                </Button>
              </>
            ) : (
              <>
                {invoiceId && (
                  <Button className="flex-1" onClick={() => router.push(`/payments/pay/${invoiceId}`)}>
                    <CreditCard className="h-4 w-4 mr-2" /> Try Again
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => router.push('/payments')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payments
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={null}>
      <PaymentResultContent />
    </Suspense>
  );
}
