'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, HelpCircle, Clock, CheckCircle2, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, statusVariant, Button, Input, StatCard, formatDate } from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';

const SR_TYPES = ['TECHNICAL_ISSUE', 'METER_VERIFICATION', 'ACTIVATION', 'DEACTIVATION', 'OTHER'];

const SRSchema = z.object({
  requestType: z.string().min(1),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Please provide a detailed description (min 20 chars)'),
});

type SRForm = z.infer<typeof SRSchema>;

interface ServiceRequest {
  id: string;
  requestNumber: string;
  requestType: string;
  status: string;
  subject: string;
  description: string;
  slaDeadline: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  OPEN: <AlertCircle className="h-4 w-4 text-amber-500" />,
  IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500" />,
  RESOLVED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  CLOSED: <CheckCircle2 className="h-4 w-4 text-gray-400" />,
};

export default function ServiceRequestsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: ServiceRequest[] }>({
    queryKey: ['service-requests'],
    queryFn: () => api.get('/service-requests').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SRForm>({
    resolver: zodResolver(SRSchema),
    defaultValues: { requestType: 'TECHNICAL_ISSUE' },
  });

  const createMutation = useMutation({
    mutationFn: (formData: SRForm) => api.post('/service-requests', formData),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['service-requests'] });
      reset();
      setShowForm(false);
    },
  });

  const requests = data?.data ?? [];
  const openCount = requests.filter((r) => r.status === 'OPEN').length;
  const inProgressCount = requests.filter((r) => r.status === 'IN_PROGRESS').length;
  const resolvedCount = requests.filter((r) => ['RESOLVED', 'CLOSED'].includes(r.status)).length;

  return (
    <div className="animate-fade-in">
      <Header title="Service Requests" subtitle="Submit and track your service requests" />

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title="Total Requests" value={requests.length} icon={<MessageSquare className="h-5 w-5 text-white" />} />
          <StatCard title="Open" value={openCount} icon={<AlertCircle className="h-5 w-5 text-white" />} variant={openCount > 0 ? 'warning' : 'default'} />
          <StatCard title="In Progress" value={inProgressCount} icon={<Clock className="h-5 w-5 text-white" />} variant="default" />
          <StatCard title="Resolved" value={resolvedCount} icon={<CheckCircle2 className="h-5 w-5 text-white" />} variant="success" />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => { setShowForm(!showForm); setSelected(null); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {showForm && (
          <Card className="border-primary/30">
            <CardHeader className="px-6 py-4 border-b">
              <CardTitle className="text-base">Submit New Service Request</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Request Type</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" {...register('requestType')}>
                    {SR_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
                  <Input placeholder="Brief description of the request" error={errors.subject?.message} {...register('subject')} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Detailed Description</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[120px] resize-none"
                    placeholder="Provide as much detail as possible..."
                    {...register('description')}
                  />
                  {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" loading={isSubmitting || createMutation.isPending}>Submit Request</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request list */}
          <Card className="lg:col-span-2">
            <CardHeader className="px-6 py-4 border-b">
              <CardTitle className="text-base">My Service Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
              ) : !requests.length ? (
                <div className="text-center py-16">
                  <HelpCircle className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No service requests yet</p>
                  <p className="text-sm text-gray-400 mt-1">Click &quot;New Request&quot; to submit one.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {requests.map((sr) => (
                    <button
                      key={sr.id}
                      onClick={() => setSelected(sr)}
                      className={`w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50/80 transition-colors group ${selected?.id === sr.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                    >
                      <div className="flex-shrink-0">{STATUS_ICON[sr.status] ?? STATUS_ICON.OPEN}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">{sr.requestNumber}</span>
                          <Badge variant={statusVariant(sr.status)} className="text-[10px]">{sr.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{sr.subject}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sr.requestType.replace(/_/g, ' ')} · {formatDate(sr.createdAt)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detail panel */}
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <CardTitle className="text-base">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {selected ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Request Number</p>
                    <p className="text-sm font-mono font-semibold">{selected.requestNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <Badge variant={statusVariant(selected.status)}>{selected.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Type</p>
                    <p className="text-sm text-gray-700">{selected.requestType.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Subject</p>
                    <p className="text-sm font-medium text-gray-900">{selected.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Submitted</p>
                    <p className="text-sm text-gray-700">{formatDate(selected.createdAt)}</p>
                  </div>
                  {selected.slaDeadline && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">SLA Deadline</p>
                      <p className="text-sm text-gray-700">{formatDate(selected.slaDeadline)}</p>
                    </div>
                  )}
                  {selected.resolvedAt && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Resolved</p>
                      <p className="text-sm text-green-600">{formatDate(selected.resolvedAt)}</p>
                    </div>
                  )}
                  {selected.resolutionNote && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Resolution</p>
                      <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3 border border-green-100">{selected.resolutionNote}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Select a request to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
