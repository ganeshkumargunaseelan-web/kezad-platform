'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, statusVariant, Button, Input, formatDate } from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';

const SR_TYPES = ['ACTIVATION', 'DEACTIVATION', 'TECHNICAL_ISSUE', 'METER_VERIFICATION', 'BILLING_DISPUTE', 'OTHER'];

const SRSchema = z.object({
  type: z.string().min(1),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Please provide a detailed description (min 20 chars)'),
  contractId: z.string().optional(),
});

type SRForm = z.infer<typeof SRSchema>;

interface ServiceRequest {
  id: string;
  workflowType: string;
  entityType: string;
  status: string;
  submittedAt: string;
  metadata?: { type?: string; subject?: string; description?: string };
}

export default function ServiceRequestsPage() {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: ServiceRequest[] }>({
    queryKey: ['service-requests'],
    queryFn: () => api.get('/workflows?type=SERVICE_REQUEST').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SRForm>({
    resolver: zodResolver(SRSchema),
    defaultValues: { type: 'TECHNICAL_ISSUE' },
  });

  const createMutation = useMutation({
    mutationFn: (data: SRForm) => api.post('/workflows', {
      workflowType: 'SERVICE_ACTIVATION',
      entityType: 'SERVICE_REQUEST',
      metadata: data,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['service-requests'] });
      reset();
      setShowForm(false);
    },
  });

  return (
    <div className="animate-fade-in">
      <Header title="Service Requests" subtitle="Submit and track your service requests" />

      <div className="p-8 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {showForm && (
          <Card className="border-primary/30">
            <CardHeader><CardTitle>Submit New Service Request</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Request Type</label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" {...register('type')}>
                    {SR_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <Input placeholder="Brief description of the request" error={errors.subject?.message} {...register('subject')} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Detailed Description</label>
                  <textarea
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[100px]"
                    placeholder="Provide as much detail as possible..."
                    {...register('description')}
                  />
                  {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
                </div>
                <div className="flex gap-3">
                  <Button type="submit" loading={isSubmitting || createMutation.isPending}>Submit Request</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>My Service Requests</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !data?.data?.length ? (
              <div className="text-center py-12">
                <HelpCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No service requests yet</p>
                <p className="text-sm text-gray-400">Click &quot;New Request&quot; to submit one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.data.map((sr) => (
                  <div key={sr.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm">{sr.metadata?.subject ?? sr.workflowType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{(sr.metadata?.type ?? sr.entityType).replace(/_/g, ' ')} · {formatDate(sr.submittedAt)}</p>
                    </div>
                    <Badge variant={statusVariant(sr.status)}>{sr.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
