'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Inbox, CheckCircle2, Clock, AlertTriangle, UserPlus,
  ChevronRight, X, Send, ExternalLink,
} from 'lucide-react';
import {
  Card, CardContent, StatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, Badge, Input, Modal, ModalFooter, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface ServiceRequest {
  id: string;
  requestNumber: string;
  customerId: string;
  requestType: string;
  status: string;
  subject: string;
  description: string;
  assignedTo: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  slaDeadline: string | null;
  createdAt: string;
  customer?: { id: string; companyName: string; customerCode: string };
}

const STATUS_META: Record<string, { label: string; variant: string; icon: React.ReactNode }> = {
  OPEN:        { label: 'Open',        variant: 'warning', icon: <AlertTriangle className="h-3 w-3" /> },
  IN_PROGRESS: { label: 'In Progress', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  RESOLVED:    { label: 'Resolved',    variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  CLOSED:      { label: 'Closed',      variant: 'secondary', icon: <CheckCircle2 className="h-3 w-3" /> },
};

const TYPE_LABELS: Record<string, string> = {
  ACTIVATION: 'Activation',
  DEACTIVATION: 'Deactivation',
  TECHNICAL_ISSUE: 'Technical Issue',
  METER_VERIFICATION: 'Meter Verification',
  OTHER: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  ACTIVATION: 'bg-emerald-100 text-emerald-700',
  DEACTIVATION: 'bg-red-100 text-red-700',
  TECHNICAL_ISSUE: 'bg-amber-100 text-amber-700',
  METER_VERIFICATION: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export default function ServiceRequestsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [actionModal, setActionModal] = useState<{ sr: ServiceRequest; action: 'assign' | 'resolve' | 'close' } | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: ServiceRequest[] }>({
    queryKey: ['emp-service-requests', statusFilter, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('requestType', typeFilter);
      return api.get(`/service-requests?${params.toString()}`).then((r) => r.data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/service-requests/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['emp-service-requests'] });
      setActionModal(null);
      setAssignTo('');
      setResolutionNote('');
    },
  });

  const requests = data?.data ?? [];
  const filtered = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.requestNumber.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.customer?.companyName.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: requests.length,
    open: requests.filter((r) => r.status === 'OPEN').length,
    inProgress: requests.filter((r) => r.status === 'IN_PROGRESS').length,
    resolved: requests.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length,
  };

  function slaStatus(sr: ServiceRequest) {
    if (!sr.slaDeadline) return null;
    const deadline = new Date(sr.slaDeadline);
    const now = new Date();
    if (sr.status === 'RESOLVED' || sr.status === 'CLOSED') return { label: 'Met', color: 'text-green-600 bg-green-50' };
    if (deadline < now) return { label: 'Breached', color: 'text-red-600 bg-red-50' };
    const hoursLeft = (deadline.getTime() - now.getTime()) / 3600_000;
    if (hoursLeft < 24) return { label: `${Math.round(hoursLeft)}h left`, color: 'text-amber-600 bg-amber-50' };
    return { label: `${Math.round(hoursLeft / 24)}d left`, color: 'text-gray-500 bg-gray-50' };
  }

  return (
    <div className="animate-fade-in">
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500">Review and action customer service requests</p>
        </div>
        {stats.open > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">{stats.open} open {stats.open === 1 ? 'request' : 'requests'} awaiting action</span>
          </div>
        )}
      </div>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Requests" value={stats.total} icon={<Inbox className="h-5 w-5" />} />
          <StatCard title="Open" value={stats.open} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" />
          <StatCard title="In Progress" value={stats.inProgress} icon={<Clock className="h-5 w-5" />} />
          <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="Search by SR#, subject, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm border rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            className="text-sm border rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Content: table + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className={selected ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}</div>
                ) : !filtered.length ? (
                  <div className="text-center py-16">
                    <Inbox className="h-14 w-14 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No service requests found</p>
                    <p className="text-sm text-gray-400 mt-1">Customer requests will appear here when submitted</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((sr) => {
                        const sMeta = STATUS_META[sr.status] ?? STATUS_META.OPEN;
                        const sla = slaStatus(sr);
                        const isOpen = sr.status === 'OPEN' || sr.status === 'IN_PROGRESS';
                        return (
                          <TableRow
                            key={sr.id}
                            className={`cursor-pointer transition-colors ${selected?.id === sr.id ? 'bg-primary/5' : isOpen ? 'hover:bg-amber-50/50' : 'hover:bg-gray-50'}`}
                            onClick={() => setSelected(sr)}
                          >
                            <TableCell>
                              <p className="text-sm font-semibold text-gray-900">{sr.subject}</p>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{sr.requestNumber}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-gray-700">{sr.customer?.companyName ?? '—'}</p>
                              <p className="text-xs text-gray-400">{sr.customer?.customerCode}</p>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-md font-medium ${TYPE_COLORS[sr.requestType] ?? 'bg-gray-100 text-gray-700'}`}>
                                {TYPE_LABELS[sr.requestType] ?? sr.requestType}
                              </span>
                            </TableCell>
                            <TableCell>
                              {sla && (
                                <span className={`text-xs px-2 py-1 rounded-md font-medium ${sla.color}`}>
                                  {sla.label}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                sMeta.variant === 'success' ? 'bg-green-100 text-green-700' :
                                sMeta.variant === 'warning' ? 'bg-amber-100 text-amber-700' :
                                sMeta.variant === 'default' ? 'bg-blue-100 text-blue-700' :
                                                               'bg-gray-100 text-gray-600'
                              }`}>
                                {sMeta.icon} {sMeta.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-gray-400">{formatDate(sr.createdAt)}</TableCell>
                            <TableCell>
                              {isOpen && (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  {sr.status === 'OPEN' && (
                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" onClick={() => setActionModal({ sr, action: 'assign' })}>
                                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50" onClick={() => setActionModal({ sr, action: 'resolve' })}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                                  </Button>
                                </div>
                              )}
                              {!isOpen && (
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <h3 className="text-sm font-bold text-gray-900">{selected.requestNumber}</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Subject</p>
                    <p className="text-sm text-gray-900 font-medium">{selected.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Description</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Customer</p>
                      <a href={`/customers/${selected.customerId}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                        {selected.customer?.companyName ?? '—'} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Type</p>
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${TYPE_COLORS[selected.requestType] ?? 'bg-gray-100 text-gray-700'}`}>
                        {TYPE_LABELS[selected.requestType] ?? selected.requestType}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Status</p>
                      <Badge variant={(STATUS_META[selected.status]?.variant as 'success' | 'warning' | 'default' | 'secondary') ?? 'default'}>
                        {STATUS_META[selected.status]?.label ?? selected.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">SLA</p>
                      {(() => {
                        const sla = slaStatus(selected);
                        return sla ? <span className={`text-xs px-2 py-1 rounded-md font-medium ${sla.color}`}>{sla.label}</span> : <span className="text-xs text-gray-400">—</span>;
                      })()}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Created</p>
                      <p className="text-xs text-gray-600">{formatDate(selected.createdAt)}</p>
                    </div>
                    {selected.assignedTo && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Assigned To</p>
                        <p className="text-xs text-gray-600">{selected.assignedTo}</p>
                      </div>
                    )}
                  </div>
                  {selected.resolutionNote && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <p className="text-xs text-green-600 font-semibold mb-1">Resolution Note</p>
                      <p className="text-sm text-green-800">{selected.resolutionNote}</p>
                    </div>
                  )}
                  {(selected.status === 'OPEN' || selected.status === 'IN_PROGRESS') && (
                    <div className="flex gap-2 pt-2 border-t">
                      {selected.status === 'OPEN' && (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setActionModal({ sr: selected, action: 'assign' })}>
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
                        </Button>
                      )}
                      <Button size="sm" className="flex-1" onClick={() => setActionModal({ sr: selected, action: 'resolve' })}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => { setActionModal(null); setAssignTo(''); setResolutionNote(''); }}
        title={actionModal?.action === 'assign' ? 'Assign Service Request' : 'Resolve Service Request'}
        size="sm"
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-xs text-gray-400 font-semibold mb-0.5">{actionModal.sr.requestNumber}</p>
              <p className="text-sm font-medium text-gray-900">{actionModal.sr.subject}</p>
              <p className="text-xs text-gray-500 mt-1">{actionModal.sr.customer?.companyName}</p>
            </div>

            {actionModal.action === 'assign' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Assign To</label>
                <Input placeholder="Enter operator name or email..." value={assignTo} onChange={(e) => setAssignTo(e.target.value)} />
              </div>
            )}

            {actionModal.action === 'resolve' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Resolution Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={4}
                  placeholder="Describe how the issue was resolved..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => { setActionModal(null); setAssignTo(''); setResolutionNote(''); }}>Cancel</Button>
          {actionModal?.action === 'assign' && (
            <Button
              disabled={!assignTo}
              loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate({
                id: actionModal.sr.id,
                body: { assignedTo: assignTo, status: 'IN_PROGRESS' },
              })}
            >
              <Send className="h-4 w-4 mr-1" /> Assign
            </Button>
          )}
          {actionModal?.action === 'resolve' && (
            <Button
              disabled={!resolutionNote}
              loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate({
                id: actionModal.sr.id,
                body: { status: 'RESOLVED', resolutionNote },
              })}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
