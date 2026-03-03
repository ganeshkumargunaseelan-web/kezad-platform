'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wind, Zap, Droplets, Snowflake, ArrowLeft, FileText,
  Calendar, Building2, MapPin, Receipt, Plus, AlertTriangle,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge, Button, Tabs, statusVariant, formatDate, formatCurrency, InfoBanner,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface Contract {
  id: string;
  contractNumber: string;
  utilityType: string;
  status: string;
  version: number;
  startDate: string;
  endDate: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteCountry: string;
  gasDetails?: {
    dcq: string; acq: string; basePrice: string; topupPrice: string;
    serviceCharge: string; currency: string;
    nominatedQuantities?: { month: number; year: number; quantity: string; submittedAt: string }[];
  };
  powerDetails?: { contractedKw: string; demandCharge: string; energyCharge: string; serviceCharge: string; hasTou: boolean; currency: string };
  waterDetails?: { contractedM3: string; waterRate: string; serviceCharge: string; currency: string };
  coolingDetails?: { contractedRt: string; demandCharge: string; consumptionCharge: string; serviceCharge: string; currency: string };
}

interface Invoice {
  id: string; invoiceNumber: string; utilityType: string; status: string;
  issueDate: string; dueDate: string; totalAmount: string; currency: string;
  paidAmount: string; outstandingAmount: string;
}

interface MeterDataPoint {
  periodStartUtc: string; periodEndUtc: string; rawValue: string; unit: string;
}

const UTILITY_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  GAS:              { icon: <Wind className="h-6 w-6" />,      color: 'text-orange-700', bg: 'bg-orange-100', label: 'Industrial Gas' },
  POWER:            { icon: <Zap className="h-6 w-6" />,       color: 'text-blue-700',   bg: 'bg-blue-100',   label: 'Power' },
  WATER:            { icon: <Droplets className="h-6 w-6" />,  color: 'text-cyan-700',   bg: 'bg-cyan-100',   label: 'Water' },
  DISTRICT_COOLING: { icon: <Snowflake className="h-6 w-6" />, color: 'text-sky-700',    bg: 'bg-sky-100',    label: 'District Cooling' },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const qc = useQueryClient();

  const [nqModal, setNqModal] = useState(false);
  const [nqMonth, setNqMonth] = useState(new Date().getMonth() + 1);
  const [nqYear, setNqYear] = useState(new Date().getFullYear());
  const [nqQty, setNqQty] = useState('');
  const [nqReason, setNqReason] = useState('');
  const [nqSuccess, setNqSuccess] = useState(false);

  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeInvoiceId, setDisputeInvoiceId] = useState('');
  const [disputeNotes, setDisputeNotes] = useState('');

  const { data: contractData, isLoading } = useQuery<{ data: Contract }>({
    queryKey: ['contract', id],
    queryFn: () => api.get(`/contracts/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: invoicesData } = useQuery<{ data: Invoice[] }>({
    queryKey: ['contract-invoices', id],
    queryFn: () => api.get('/billing/invoices', { params: { contractId: id, limit: 20 } }).then((r) => r.data),
    enabled: !!id && activeTab === 'invoices',
  });

  const { data: consumptionData } = useQuery<{ data: MeterDataPoint[] }>({
    queryKey: ['contract-consumption', id],
    queryFn: () => api.get('/consumption/data', { params: { contractId: id, limit: 30 } }).then((r) => r.data),
    enabled: !!id && activeTab === 'consumption',
  });

  const submitNqMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/nominated-quantity`, {
      periodYear: nqYear, periodMonth: nqMonth, nominatedQty: nqQty, changeReason: nqReason,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contract', id] });
      setNqModal(false); setNqSuccess(true); setNqQty(''); setNqReason('');
    },
  });

  const submitDisputeMutation = useMutation({
    mutationFn: () => api.post('/workflows', {
      workflowType: 'BILLING_DISPUTE', entityType: 'INVOICE',
      entityId: disputeInvoiceId, contractId: id, notes: disputeNotes,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['contract-invoices', id] });
      setDisputeModal(false); setDisputeNotes(''); setDisputeInvoiceId('');
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map((i) => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  const contract = contractData?.data;
  if (!contract) {
    return (
      <div className="text-center py-20">
        <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500">Contract not found</p>
        <a href="/contracts"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></a>
      </div>
    );
  }

  const meta = UTILITY_META[contract.utilityType] ?? UTILITY_META.POWER!;
  const invoices = invoicesData?.data ?? [];
  const consumption = consumptionData?.data ?? [];
  const nqList = contract.gasDetails?.nominatedQuantities ?? [];

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5">
        <a href="/contracts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Contracts
        </a>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${meta.bg} ${meta.color}`}>{meta.icon}</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{contract.contractNumber}</h1>
                <Badge variant={statusVariant(contract.status)}>{contract.status}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{meta.label} · Version {contract.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm text-gray-500">
              <div className="flex items-center gap-1 justify-end">
                <Calendar className="h-3.5 w-3.5" /><span>{formatDate(contract.startDate)}</span>
                {contract.endDate && <><span>—</span><span>{formatDate(contract.endDate)}</span></>}
              </div>
              {contract.siteCity && (
                <div className="flex items-center gap-1 justify-end mt-1">
                  <MapPin className="h-3.5 w-3.5" /><span>{contract.siteCity}, {contract.siteCountry}</span>
                </div>
              )}
            </div>
            {contract.utilityType === 'GAS' && contract.status === 'ACTIVE' && (
              <Button size="sm" onClick={() => { setNqSuccess(false); setNqModal(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Submit Nominated Qty
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {nqSuccess && <InfoBanner variant="success" message="Nominated quantity submitted successfully. Your consumption profile has been updated." />}

        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'invoices', label: 'Invoices', count: invoices.length || undefined },
            { id: 'consumption', label: 'Consumption' },
            ...(contract.utilityType === 'GAS' ? [{ id: 'nominated', label: 'Nominated Qty', count: nqList.length || undefined }] : []),
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="px-6 py-4 border-b"><CardTitle className="text-sm font-semibold text-gray-700">Contract Terms</CardTitle></CardHeader>
              <CardContent className="px-6 py-2">
                {contract.gasDetails && (
                  <>
                    <InfoRow label="DCQ (Daily Contract Qty)" value={`${parseFloat(contract.gasDetails.dcq).toLocaleString()} MMBTU/day`} />
                    <InfoRow label="ACQ (Annual Contract Qty)" value={`${parseFloat(contract.gasDetails.acq).toLocaleString()} MMBTU`} />
                    <InfoRow label="Base Price" value={`${contract.gasDetails.currency} ${parseFloat(contract.gasDetails.basePrice).toFixed(4)}/MMBTU`} />
                    <InfoRow label="Top-up Price" value={`${contract.gasDetails.currency} ${parseFloat(contract.gasDetails.topupPrice ?? '0').toFixed(4)}/MMBTU`} />
                    <InfoRow label="Service Charge" value={`${contract.gasDetails.currency} ${parseFloat(contract.gasDetails.serviceCharge).toFixed(2)}/month`} />
                  </>
                )}
                {contract.powerDetails && (
                  <>
                    <InfoRow label="Contracted Capacity" value={`${parseFloat(contract.powerDetails.contractedKw).toLocaleString()} kW`} />
                    <InfoRow label="Demand Charge" value={`${contract.powerDetails.currency} ${parseFloat(contract.powerDetails.demandCharge).toFixed(4)}/kW`} />
                    <InfoRow label="Energy Charge" value={`${contract.powerDetails.currency} ${parseFloat(contract.powerDetails.energyCharge).toFixed(4)}/kWh`} />
                    <InfoRow label="Time-of-Use" value={contract.powerDetails.hasTou ? 'Enabled' : 'Standard'} />
                  </>
                )}
                {contract.waterDetails && (
                  <>
                    <InfoRow label="Contracted Volume" value={`${parseFloat(contract.waterDetails.contractedM3).toLocaleString()} m³/month`} />
                    <InfoRow label="Water Rate" value={`${contract.waterDetails.currency} ${parseFloat(contract.waterDetails.waterRate).toFixed(4)}/m³`} />
                  </>
                )}
                {contract.coolingDetails && (
                  <>
                    <InfoRow label="Contracted Capacity" value={`${parseFloat(contract.coolingDetails.contractedRt).toLocaleString()} RT`} />
                    <InfoRow label="Demand Charge" value={`${contract.coolingDetails.currency} ${parseFloat(contract.coolingDetails.demandCharge).toFixed(4)}/RT`} />
                    <InfoRow label="Consumption Charge" value={`${contract.coolingDetails.currency} ${parseFloat(contract.coolingDetails.consumptionCharge).toFixed(4)}/RTh`} />
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-6 py-4 border-b">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Building2 className="h-4 w-4" /> Site Information</CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-2">
                <InfoRow label="Service Address" value={contract.siteAddress ?? '—'} />
                <InfoRow label="City" value={contract.siteCity ?? '—'} />
                <InfoRow label="Country" value={contract.siteCountry} />
                <InfoRow label="Contract Start" value={formatDate(contract.startDate)} />
                <InfoRow label="Contract End" value={contract.endDate ? formatDate(contract.endDate) : 'Open-ended'} />
                <InfoRow label="Contract Version" value={`v${contract.version}`} />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'invoices' && (
          <Card>
            <CardContent className="p-0">
              {!invoices.length ? (
                <div className="text-center py-12"><Receipt className="h-10 w-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-500">No invoices yet</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No.</TableHead><TableHead>Issue Date</TableHead><TableHead>Due Date</TableHead>
                      <TableHead>Total</TableHead><TableHead>Outstanding</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-semibold">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(inv.dueDate)}</TableCell>
                        <TableCell className="font-semibold text-sm">{formatCurrency(Number(inv.totalAmount), inv.currency)}</TableCell>
                        <TableCell className={`text-sm font-medium ${parseFloat(inv.outstandingAmount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(Number(inv.outstandingAmount), inv.currency)}
                        </TableCell>
                        <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => window.open(`/api/billing/invoices/${inv.id}/pdf`)}>
                              <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                            </Button>
                            {['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(inv.status) && (
                              <Button
                                variant="outline" size="sm"
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                onClick={() => { setDisputeInvoiceId(inv.id); setDisputeModal(true); }}
                              >
                                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Dispute
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'consumption' && (
          <Card>
            <CardHeader className="px-6 py-4 border-b"><CardTitle className="text-sm font-semibold text-gray-700">Recent Consumption Data</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!consumption.length ? (
                <div className="text-center py-12"><Zap className="h-10 w-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-500">No consumption data available</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Period Start</TableHead><TableHead>Period End</TableHead><TableHead>Reading</TableHead><TableHead>Unit</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumption.map((dp, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-gray-500">{formatDate(dp.periodStartUtc)}</TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(dp.periodEndUtc)}</TableCell>
                        <TableCell className="font-semibold">{parseFloat(dp.rawValue).toLocaleString(undefined, { maximumFractionDigits: 4 })}</TableCell>
                        <TableCell className="text-xs text-gray-500">{dp.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'nominated' && contract.utilityType === 'GAS' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
              <CardTitle className="text-sm font-semibold text-gray-700">Nominated Quantities</CardTitle>
              {contract.status === 'ACTIVE' && (
                <Button size="sm" onClick={() => { setNqSuccess(false); setNqModal(true); }}><Plus className="h-4 w-4 mr-1" /> Submit Update</Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {!nqList.length ? (
                <div className="text-center py-12">
                  <Wind className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">No nominated quantities submitted yet</p>
                  <p className="text-xs text-gray-400 mt-1">Submit monthly quantity nominations for your gas contract</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Month</TableHead><TableHead>Year</TableHead><TableHead>Nominated Qty (MMBTU)</TableHead><TableHead>Submitted</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {nqList.map((nq, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{MONTHS[(nq.month - 1) % 12]}</TableCell>
                        <TableCell>{nq.year}</TableCell>
                        <TableCell className="font-mono font-semibold">{parseFloat(nq.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-xs text-gray-400">{formatDate(nq.submittedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Nominated Quantity Modal */}
      {nqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNqModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Submit Nominated Quantity</h3>
            <p className="text-sm text-gray-500 mb-4">Update your monthly gas consumption nomination. Amendments are subject to 140-day notice requirements and DCQ constraints.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Month</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={nqMonth} onChange={(e) => setNqMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Year</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={nqYear} onChange={(e) => setNqYear(Number(e.target.value))}>
                    {[0,1,2].map((offset) => { const y = new Date().getFullYear() + offset; return <option key={y} value={y}>{y}</option>; })}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Nominated Quantity (MMBTU)
                  {contract.gasDetails && <span className="text-xs text-gray-400 ml-2">DCQ: {parseFloat(contract.gasDetails.dcq).toLocaleString()} MMBTU/day</span>}
                </label>
                <input type="number" step="0.01" min="0" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. 15000.00" value={nqQty} onChange={(e) => setNqQty(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Reason for Change</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[70px]" placeholder="Explain reason for this nomination update..." value={nqReason} onChange={(e) => setNqReason(e.target.value)} />
              </div>
              {submitNqMutation.isError && <p className="text-sm text-red-600">Failed to submit. Check values and try again.</p>}
            </div>
            <div className="flex gap-3 mt-4">
              <Button className="flex-1" disabled={!nqQty || !nqReason.trim()} loading={submitNqMutation.isPending} onClick={() => submitNqMutation.mutate()}>
                <Plus className="h-4 w-4 mr-2" /> Submit Nomination
              </Button>
              <Button variant="outline" onClick={() => setNqModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Dispute Modal */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDisputeModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Raise Billing Dispute</h3>
            <p className="text-sm text-gray-500 mb-4">Submit a dispute for this invoice. Our team will review and respond within 5 business days.</p>
            <InfoBanner variant="warning" message="Normal payment terms still apply unless the dispute is formally resolved by KEZAD." className="mb-4" />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Reason for Dispute</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]" placeholder="Describe the reason for disputing this invoice..." value={disputeNotes} onChange={(e) => setDisputeNotes(e.target.value)} />
            </div>
            {submitDisputeMutation.isError && <p className="text-sm text-red-600 mt-2">Failed to submit dispute. Please try again.</p>}
            {submitDisputeMutation.isSuccess && <p className="text-sm text-green-600 mt-2">Dispute submitted successfully.</p>}
            <div className="flex gap-3 mt-4">
              <Button className="flex-1" disabled={!disputeNotes.trim()} loading={submitDisputeMutation.isPending} onClick={() => submitDisputeMutation.mutate()}>
                <AlertTriangle className="h-4 w-4 mr-2" /> Submit Dispute
              </Button>
              <Button variant="outline" onClick={() => setDisputeModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
