'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Mail, Phone, User, RefreshCw, ShieldCheck, MapPin,
  FileText, Receipt, Calendar, ArrowLeft, ExternalLink, Edit, Zap,
  Droplets, Wind, Snowflake, AlertTriangle,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, statusVariant,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, StatCard, formatDate, formatDateTime, formatCurrency,
} from '@kezad/ui';
import { api } from '@/lib/api';

const UTILITY_ICONS: Record<string, React.ReactNode> = {
  GAS: <Wind className="h-4 w-4" />,
  POWER: <Zap className="h-4 w-4" />,
  WATER: <Droplets className="h-4 w-4" />,
  DISTRICT_COOLING: <Snowflake className="h-4 w-4" />,
};

const UTILITY_COLORS: Record<string, string> = {
  GAS: 'bg-orange-100 text-orange-700',
  POWER: 'bg-blue-100 text-blue-700',
  WATER: 'bg-cyan-100 text-cyan-700',
  DISTRICT_COOLING: 'bg-sky-100 text-sky-700',
};

interface CustomerContact { id: string; name: string; role: string; email: string; phone: string; isPrimary: boolean; }
interface Contract { id: string; contractNumber: string; utilityType: string; status: string; startDate: string; }
interface Customer {
  id: string; customerCode: string; companyName: string; tradeLicenseNo: string;
  vatRegistrationNo: string; industry: string; address: Record<string, string> | null;
  isActive: boolean; crmSyncStatus: string; crmSyncedAt: string | null;
  createdAt: string; updatedAt: string;
  contacts: CustomerContact[];
  contracts: Contract[];
  documents: { id: string; type: string; url: string; uploadedAt: string }[];
  user: { email: string; lastLoginAt: string | null };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-40 flex-shrink-0 pt-0.5 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{value || '—'}</span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}`).then((r) => r.data.data as Customer),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post(`/customers/${id}/crm-sync`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['customer', id] }),
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white border-b px-8 py-5">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Customer not found</p>
      <a href="/customers" className="text-primary text-sm hover:underline mt-2 inline-block">← Back to Customers</a>
    </div>
  );

  const primaryContact = data.contacts.find((c) => c.isPrimary) ?? data.contacts[0];
  const activeContracts = data.contracts.filter((c) => c.status === 'ACTIVE').length;
  const addr = data.address as Record<string, string> | null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/customers" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{data.companyName}</h1>
              <Badge variant={data.isActive ? 'success' : 'secondary'}>
                {data.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={data.crmSyncStatus === 'SYNCED' ? 'success' : 'warning'}>
                CRM: {data.crmSyncStatus}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {data.customerCode} · {data.industry} · Joined {formatDate(data.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" loading={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Sync CRM
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Contracts" value={data.contracts.length} icon={<FileText className="h-5 w-5" />} />
          <StatCard title="Active Contracts" value={activeContracts} icon={<ShieldCheck className="h-5 w-5" />} variant="success" />
          <StatCard title="Contacts" value={data.contacts.length} icon={<User className="h-5 w-5" />} />
          <StatCard title="Documents" value={data.documents.length} icon={<FileText className="h-5 w-5" />} />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Details */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" /> Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <InfoRow label="Company Name" value={data.companyName} />
              <InfoRow label="Customer Code" value={<span className="font-mono text-xs">{data.customerCode}</span>} />
              <InfoRow label="Industry" value={data.industry} />
              <InfoRow label="Trade License" value={data.tradeLicenseNo} />
              <InfoRow label="VAT Reg No" value={data.vatRegistrationNo} />
              {addr && (
                <InfoRow label="Address" value={
                  <span className="flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                    {[addr.street, addr.city, addr.emirate, addr.country].filter(Boolean).join(', ')}
                  </span>
                } />
              )}
              <InfoRow label="CRM Synced" value={data.crmSyncedAt ? formatDateTime(data.crmSyncedAt) : 'Never'} />
            </CardContent>
          </Card>

          {/* Primary Contact */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" /> Primary Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {primaryContact ? (
                <>
                  <InfoRow label="Name" value={primaryContact.name} />
                  <InfoRow label="Role" value={primaryContact.role} />
                  <InfoRow label="Email" value={
                    <a href={`mailto:${primaryContact.email}`} className="text-primary hover:underline flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> {primaryContact.email}
                    </a>
                  } />
                  <InfoRow label="Phone" value={
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-gray-400" /> {primaryContact.phone}
                    </span>
                  } />
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">All Contacts</p>
                    {data.contacts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.role} · {c.email}</p>
                        </div>
                        {c.isPrimary && <Badge variant="info">Primary</Badge>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">No contacts on file</p>
              )}
            </CardContent>
          </Card>

          {/* Portal Account */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gray-400" /> Portal Account
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <InfoRow label="Login Email" value={data.user.email} />
              <InfoRow label="Last Login" value={data.user.lastLoginAt ? formatDateTime(data.user.lastLoginAt) : 'Never'} />
              <InfoRow label="Customer Since" value={formatDate(data.createdAt)} />
              <InfoRow label="Last Updated" value={formatDate(data.updatedAt)} />
            </CardContent>
          </Card>
        </div>

        {/* Contracts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contracts ({data.contracts.length})</CardTitle>
            <Button size="sm" variant="outline">
              <FileText className="h-4 w-4 mr-2" /> New Contract
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!data.contracts.length ? (
              <div className="text-center py-10">
                <FileText className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No contracts yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Utility Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-semibold">{c.contractNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${UTILITY_COLORS[c.utilityType] ?? 'bg-gray-100 text-gray-600'}`}>
                            {UTILITY_ICONS[c.utilityType]}
                          </span>
                          <span className="text-sm">{c.utilityType.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={statusVariant(c.status)}>{c.status}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(c.startDate)}</TableCell>
                      <TableCell>
                        <a href={`/contracts/${c.id}`} className="text-primary hover:underline text-xs flex items-center gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
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
