'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Inbox, CheckCircle2, Clock, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import {
  Card, CardContent, StatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, Badge, Modal, ModalFooter, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface WorkflowInstance {
  id: string;
  workflowType: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStep: number;
  submittedAt: string;
  submittedBy: string;
  metadata?: {
    type?: string;
    subject?: string;
    description?: string;
    priority?: string;
    contractId?: string;
    customerId?: string;
  };
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'secondary'; icon: React.ReactNode }> = {
  PENDING:     { label: 'Pending',     variant: 'warning',   icon: <Clock className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { label: 'In Progress', variant: 'default',   icon: <Clock className="h-3.5 w-3.5" /> },
  APPROVED:    { label: 'Approved',    variant: 'success',   icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  REJECTED:    { label: 'Rejected',    variant: 'danger',    icon: <XCircle className="h-3.5 w-3.5" /> },
  CANCELLED:   { label: 'Cancelled',   variant: 'secondary', icon: <XCircle className="h-3.5 w-3.5" /> },
  COMPLETED:   { label: 'Completed',   variant: 'success',   icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  LOW:      { color: 'text-gray-500',  label: 'Low' },
  MEDIUM:   { color: 'text-blue-600',  label: 'Medium' },
  HIGH:     { color: 'text-orange-600', label: 'High' },
  CRITICAL: { color: 'text-red-600',   label: 'Critical' },
};

export default function ServiceRequestsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionModal, setActionModal] = useState<{ id: string; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [comment, setComment] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: WorkflowInstance[] }>({
    queryKey: ['service-requests', statusFilter],
    queryFn: () => api.get('/workflows', {
      params: { entityType: 'SERVICE_REQUEST', ...(statusFilter ? { status: statusFilter } : {}) },
    }).then((r) => r.data),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/workflows/${id}/action`, { action, comment }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['service-requests'] });
      setActionModal(null);
      setComment('');
    },
  });

  const requests = data?.data ?? [];
  const filtered = requests.filter((r) => {
    const subject = r.metadata?.subject ?? r.workflowType;
    return !search || subject.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search);
  });

  const stats = {
    total: requests.length,
    open: requests.filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length,
    approved: requests.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED').length,
    rejected: requests.filter((r) => r.status === 'REJECTED').length,
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-sm text-gray-500">Review and action customer service requests</p>
        </div>
        {stats.open > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">{stats.open} open {stats.open === 1 ? 'request' : 'requests'} pending action</span>
          </div>
        )}
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Requests" value={stats.total} icon={<Inbox className="h-5 w-5" />} />
          <StatCard title="Open" value={stats.open} icon={<Clock className="h-5 w-5" />} variant="warning" />
          <StatCard title="Approved" value={stats.approved} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" />
          <StatCard title="Rejected" value={stats.rejected} icon={<XCircle className="h-5 w-5" />} variant="danger" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="Search by subject or request ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !filtered.length ? (
              <div className="text-center py-16">
                <Inbox className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No service requests found</p>
                <p className="text-sm text-gray-400">Customer requests will appear here for review</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const statusMeta = STATUS_META[r.status] ?? STATUS_META.PENDING;
                    const priority = r.metadata?.priority ?? 'MEDIUM';
                    const priorityMeta = PRIORITY_META[priority] ?? PRIORITY_META.MEDIUM;
                    const isOpen = r.status === 'PENDING' || r.status === 'IN_PROGRESS';
                    return (
                      <TableRow key={r.id} className={isOpen ? 'bg-amber-50/30' : ''}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {r.metadata?.subject ?? r.workflowType.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{r.id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-medium">
                            {r.metadata?.type ?? r.entityType.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold ${priorityMeta.color}`}>
                            {priorityMeta.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">Step {r.currentStep}</span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">{formatDate(r.submittedAt)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            statusMeta.variant === 'success' ? 'bg-green-100 text-green-700' :
                            statusMeta.variant === 'warning' ? 'bg-amber-100 text-amber-700' :
                            statusMeta.variant === 'danger'  ? 'bg-red-100 text-red-700' :
                                                               'bg-gray-100 text-gray-700'
                          }`}>
                            {statusMeta.icon} {statusMeta.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isOpen && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setActionModal({ id: r.id, action: 'APPROVE' })}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setActionModal({ id: r.id, action: 'REJECT' })}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {!isOpen && (
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </Button>
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

      {/* Action Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => { setActionModal(null); setComment(''); }}
        title={actionModal?.action === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
        size="sm"
      >
        <div className="space-y-4">
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            actionModal?.action === 'APPROVE' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {actionModal?.action === 'APPROVE'
              ? 'This will approve the service request and notify the customer.'
              : 'This will reject the service request. Please provide a reason.'}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Comment {actionModal?.action === 'REJECT' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3}
              placeholder="Add a comment or reason..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setActionModal(null); setComment(''); }}>Cancel</Button>
          <Button
            disabled={actionModal?.action === 'REJECT' && !comment}
            loading={actionMutation.isPending}
            className={actionModal?.action === 'REJECT' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}
            onClick={() => actionModal && actionMutation.mutate({ id: actionModal.id, action: actionModal.action })}
          >
            {actionModal?.action === 'APPROVE' ? 'Approve' : 'Reject'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
