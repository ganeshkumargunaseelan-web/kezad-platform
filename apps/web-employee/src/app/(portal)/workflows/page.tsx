'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, CheckCircle, XCircle, RotateCcw, Clock } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, statusVariant,
  Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, formatDate,
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
}

const ACTION_LABELS = { APPROVE: 'Approve', REJECT: 'Reject', SEND_BACK: 'Send Back' };

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [commentModal, setCommentModal] = useState<{ id: string; action: 'APPROVE' | 'REJECT' | 'SEND_BACK' } | null>(null);
  const [comment, setComment] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: WorkflowInstance[] }>({
    queryKey: ['workflows', activeTab],
    queryFn: () => api.get(`/workflows?${activeTab === 'PENDING' ? 'status=PENDING,IN_PROGRESS' : ''}`).then((r) => r.data),
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

  const instances = data?.data ?? [];
  const pendingCount = instances.filter((w) => ['PENDING', 'IN_PROGRESS'].includes(w.status)).length;

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Workflow Inbox</h1>
        <p className="text-sm text-gray-500">Review and action pending approval requests</p>
      </div>

      <div className="p-8 space-y-6">
        {/* Tab switcher */}
        <div className="flex gap-2">
          {(['PENDING', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab === 'PENDING' ? <Clock className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
              {tab === 'PENDING' ? `Pending (${pendingCount})` : 'All Workflows'}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !instances.length ? (
              <div className="text-center py-16">
                <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">All caught up!</p>
                <p className="text-sm text-gray-400">No pending workflows.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Initiated By</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map((wf) => (
                    <TableRow key={wf.id}>
                      <TableCell className="font-medium">{wf.workflowType.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <p className="text-xs text-gray-400">{wf.entityType}</p>
                        <p className="text-xs font-mono">{wf.entityId?.slice(0, 8)}…</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{wf.submittedBy?.slice(0, 8)}</TableCell>
                      <TableCell>
                        <span className="text-xs">Step {wf.currentStep}</span>
                      </TableCell>
                      <TableCell><Badge variant={statusVariant(wf.status)}>{wf.status}</Badge></TableCell>
                      <TableCell className="text-xs text-gray-400">{formatDate(wf.submittedAt)}</TableCell>
                      <TableCell>
                        {['PENDING', 'IN_PROGRESS'].includes(wf.status) && (
                          <div className="flex gap-1">
                            {(['APPROVE', 'REJECT', 'SEND_BACK'] as const).map((action) => (
                              <Button
                                key={action}
                                size="sm"
                                variant={action === 'APPROVE' ? 'default' : action === 'REJECT' ? 'destructive' : 'outline'}
                                onClick={() => setCommentModal({ id: wf.id, action })}
                              >
                                {action === 'APPROVE' ? <CheckCircle className="h-3 w-3" /> :
                                 action === 'REJECT' ? <XCircle className="h-3 w-3" /> :
                                 <RotateCcw className="h-3 w-3" />}
                                <span className="ml-1 hidden sm:inline">{ACTION_LABELS[action]}</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">{ACTION_LABELS[commentModal.action]}</h3>
            <p className="text-sm text-gray-500 mb-4">Add a comment (optional for approval, recommended for rejection/send-back)</p>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Add comments..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <Button
                className="flex-1"
                variant={commentModal.action === 'REJECT' ? 'destructive' : 'default'}
                loading={actionMutation.isPending}
                onClick={() => actionMutation.mutate({ id: commentModal.id, action: commentModal.action, comments: comment })}
              >
                Confirm {ACTION_LABELS[commentModal.action]}
              </Button>
              <Button variant="outline" onClick={() => setCommentModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
