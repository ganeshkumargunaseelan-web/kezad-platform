'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, CheckCircle, XCircle, RotateCcw, Clock, FileText, Tag, Receipt, Users } from 'lucide-react';
import {
  Card, CardContent, Badge, statusVariant,
  Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, formatDate,
  Modal, ModalFooter, StatCard,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface WorkflowInstance {
  id: string;
  workflowType: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  status: string;
  submittedAt: string;
  submittedBy: string;
  notes: string | null;
  metadata?: Record<string, string | null>;
  definition?: { name: string; workflowType: string };
  actions?: Array<{ actionType: string; actedBy: string; comments: string | null; actedAt: string }>;
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  TARIFF: <Tag className="h-3.5 w-3.5" />,
  INVOICE: <Receipt className="h-3.5 w-3.5" />,
  CONTRACT: <FileText className="h-3.5 w-3.5" />,
  CUSTOMER: <Users className="h-3.5 w-3.5" />,
};

const ACTION_LABELS = { APPROVE: 'Approve', REJECT: 'Reject', SEND_BACK: 'Send Back' } as const;

function getEntityLabel(wf: WorkflowInstance): string {
  if (wf.metadata?.tariffName) return wf.metadata.tariffName;
  if (wf.metadata?.contractNumber) return wf.metadata.contractNumber;
  if (wf.metadata?.invoiceNumber) return wf.metadata.invoiceNumber;
  if (wf.metadata?.companyName) return wf.metadata.companyName;
  if (wf.metadata?.subject) return wf.metadata.subject;
  return `${wf.entityType} #${wf.entityId.slice(0, 8)}`;
}

function getWorkflowLabel(wf: WorkflowInstance): string {
  if (wf.definition?.name) return wf.definition.name;
  return wf.workflowType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [commentModal, setCommentModal] = useState<{ wf: WorkflowInstance; action: 'APPROVE' | 'REJECT' | 'SEND_BACK' } | null>(null);
  const [comment, setComment] = useState('');
  const [detailModal, setDetailModal] = useState<WorkflowInstance | null>(null);
  const qc = useQueryClient();

  // Fetch ALL workflows and filter client-side
  const { data, isLoading } = useQuery<{ data: WorkflowInstance[] }>({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows?limit=100').then((r) => r.data),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, comments }: { id: string; action: string; comments?: string }) =>
      api.post(`/workflows/${id}/action`, { action, comments }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workflows'] });
      void qc.invalidateQueries({ queryKey: ['kpi'] });
      setCommentModal(null);
      setComment('');
    },
  });

  const allInstances = data?.data ?? [];
  const pendingInstances = allInstances.filter((w) => ['PENDING', 'IN_PROGRESS'].includes(w.status));
  const displayed = activeTab === 'PENDING' ? pendingInstances : allInstances;

  const stats = {
    pending: pendingInstances.length,
    approved: allInstances.filter((w) => w.status === 'APPROVED' || w.status === 'COMPLETED').length,
    rejected: allInstances.filter((w) => w.status === 'REJECTED').length,
    total: allInstances.length,
  };

  return (
    <div className="animate-fade-in">
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workflow Inbox</h1>
          <p className="text-sm text-gray-500">Review and action pending approval requests</p>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">{stats.pending} pending approval{stats.pending !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Workflows" value={stats.total} icon={<GitBranch className="h-5 w-5" />} />
          <StatCard title="Pending" value={stats.pending} icon={<Clock className="h-5 w-5" />} variant="warning" />
          <StatCard title="Approved" value={stats.approved} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
          <StatCard title="Rejected" value={stats.rejected} icon={<XCircle className="h-5 w-5" />} variant="danger" />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          {(['PENDING', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab ? 'bg-primary text-white shadow-md' : 'bg-white border text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {tab === 'PENDING' ? <Clock className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
              {tab === 'PENDING' ? `Pending (${stats.pending})` : `All Workflows (${stats.total})`}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />)}</div>
            ) : !displayed.length ? (
              <div className="text-center py-16">
                <CheckCircle className="h-14 w-14 text-emerald-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No pending workflows to review.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((wf) => {
                    const isPending = ['PENDING', 'IN_PROGRESS'].includes(wf.status);
                    return (
                      <TableRow
                        key={wf.id}
                        className={`cursor-pointer transition-colors ${isPending ? 'hover:bg-amber-50/50' : 'hover:bg-gray-50'}`}
                        onClick={() => setDetailModal(wf)}
                      >
                        <TableCell>
                          <p className="text-sm font-semibold text-gray-900">{getWorkflowLabel(wf)}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{wf.id.slice(0, 12)}...</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                              {ENTITY_ICONS[wf.entityType] ?? <FileText className="h-3.5 w-3.5" />}
                            </span>
                            <div>
                              <p className="text-sm text-gray-700">{wf.entityType.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-700 font-medium truncate max-w-[200px]">{getEntityLabel(wf)}</p>
                          {wf.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{wf.notes}</p>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {[1, 2, 3].map((s) => (
                                <div key={s} className={`w-2 h-2 rounded-full ${s <= wf.currentStep ? 'bg-primary' : 'bg-gray-200'}`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">L{wf.currentStep}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={statusVariant(wf.status)}>{wf.status}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-400">{formatDate(wf.submittedAt)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isPending && (
                            <div className="flex gap-1">
                              {(['APPROVE', 'REJECT', 'SEND_BACK'] as const).map((action) => (
                                <Button
                                  key={action}
                                  size="sm"
                                  variant={action === 'APPROVE' ? 'default' : action === 'REJECT' ? 'destructive' : 'outline'}
                                  onClick={() => setCommentModal({ wf, action })}
                                >
                                  {action === 'APPROVE' ? <CheckCircle className="h-3 w-3" /> :
                                   action === 'REJECT' ? <XCircle className="h-3 w-3" /> :
                                   <RotateCcw className="h-3 w-3" />}
                                  <span className="ml-1 hidden xl:inline">{ACTION_LABELS[action]}</span>
                                </Button>
                              ))}
                            </div>
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

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Workflow Details" size="lg">
        {detailModal && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Workflow</p>
                <p className="text-sm font-medium text-gray-900">{getWorkflowLabel(detailModal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Status</p>
                <Badge variant={statusVariant(detailModal.status)}>{detailModal.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Entity Type</p>
                <p className="text-sm text-gray-700">{detailModal.entityType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Entity</p>
                <p className="text-sm text-gray-700">{getEntityLabel(detailModal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Submitted</p>
                <p className="text-sm text-gray-700">{formatDate(detailModal.submittedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Current Step</p>
                <p className="text-sm text-gray-700">Level {detailModal.currentStep}</p>
              </div>
            </div>

            {detailModal.notes && (
              <div className="bg-gray-50 rounded-lg p-3 border">
                <p className="text-xs text-gray-400 font-semibold mb-1">Notes / Justification</p>
                <p className="text-sm text-gray-700">{detailModal.notes}</p>
              </div>
            )}

            {detailModal.metadata && Object.keys(detailModal.metadata).length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Metadata</p>
                <div className="bg-gray-50 rounded-lg p-3 border space-y-1.5">
                  {Object.entries(detailModal.metadata).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 min-w-[120px]">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-gray-700 font-medium">{v ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailModal.actions && detailModal.actions.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Action History</p>
                <div className="space-y-2">
                  {detailModal.actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        a.actionType === 'APPROVE' ? 'bg-green-100 text-green-600' :
                        a.actionType === 'REJECT' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {a.actionType === 'APPROVE' ? <CheckCircle className="h-3 w-3" /> :
                         a.actionType === 'REJECT' ? <XCircle className="h-3 w-3" /> :
                         <RotateCcw className="h-3 w-3" />}
                      </div>
                      <div>
                        <p className="text-gray-700 font-medium">{a.actionType}</p>
                        <p className="text-xs text-gray-400">{formatDate(a.actedAt)}</p>
                        {a.comments && <p className="text-xs text-gray-500 mt-0.5">{a.comments}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setDetailModal(null)}>Close</Button>
          {detailModal && ['PENDING', 'IN_PROGRESS'].includes(detailModal.status) && (
            <>
              <Button variant="destructive" onClick={() => { setDetailModal(null); setCommentModal({ wf: detailModal, action: 'REJECT' }); }}>Reject</Button>
              <Button onClick={() => { setDetailModal(null); setCommentModal({ wf: detailModal, action: 'APPROVE' }); }}>Approve</Button>
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* Action Comment Modal */}
      <Modal
        open={!!commentModal}
        onClose={() => { setCommentModal(null); setComment(''); }}
        title={commentModal ? ACTION_LABELS[commentModal.action] : ''}
        size="sm"
      >
        {commentModal && (
          <div className="space-y-4">
            <div className={`rounded-lg border px-4 py-3 text-sm ${
              commentModal.action === 'APPROVE' ? 'bg-green-50 border-green-200 text-green-700' :
              commentModal.action === 'REJECT' ? 'bg-red-50 border-red-200 text-red-700' :
              'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              {commentModal.action === 'APPROVE' && 'This will approve the workflow and advance it to the next step.'}
              {commentModal.action === 'REJECT' && 'This will reject the workflow. Please provide a reason.'}
              {commentModal.action === 'SEND_BACK' && 'This will send the workflow back to the previous step for revision.'}
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-sm font-medium text-gray-900">{getWorkflowLabel(commentModal.wf)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{getEntityLabel(commentModal.wf)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Comment {commentModal.action !== 'APPROVE' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Add comments..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => { setCommentModal(null); setComment(''); }}>Cancel</Button>
          {commentModal && (
            <Button
              variant={commentModal.action === 'REJECT' ? 'destructive' : 'default'}
              disabled={commentModal.action !== 'APPROVE' && !comment}
              loading={actionMutation.isPending}
              onClick={() => actionMutation.mutate({ id: commentModal.wf.id, action: commentModal.action, comments: comment })}
            >
              Confirm {ACTION_LABELS[commentModal.action]}
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
