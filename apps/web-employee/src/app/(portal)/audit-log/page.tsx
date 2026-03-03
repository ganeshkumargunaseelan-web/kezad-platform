'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Shield, User, FileText, Receipt, CreditCard, Clock } from 'lucide-react';
import {
  Card, CardContent, Badge, formatDate,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@kezad/ui';
import { api } from '@/lib/api';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  performedAt: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

const ACTION_META: Record<string, { color: string; label: string }> = {
  CREATE:     { color: 'bg-green-100 text-green-700',  label: 'Created' },
  UPDATE:     { color: 'bg-blue-100 text-blue-700',    label: 'Updated' },
  DELETE:     { color: 'bg-red-100 text-red-700',      label: 'Deleted' },
  ACTIVATE:   { color: 'bg-emerald-100 text-emerald-700', label: 'Activated' },
  TERMINATE:  { color: 'bg-orange-100 text-orange-700', label: 'Terminated' },
  APPROVE:    { color: 'bg-green-100 text-green-700',  label: 'Approved' },
  REJECT:     { color: 'bg-red-100 text-red-700',      label: 'Rejected' },
  LOGIN:      { color: 'bg-gray-100 text-gray-700',    label: 'Login' },
};

const ENTITY_ICON: Record<string, React.ReactNode> = {
  CONTRACT:  <FileText className="h-4 w-4" />,
  CUSTOMER:  <User className="h-4 w-4" />,
  INVOICE:   <Receipt className="h-4 w-4" />,
  USER:      <Shield className="h-4 w-4" />,
  PAYMENT:   <CreditCard className="h-4 w-4" />,
};

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Fetch from workflows as a proxy for auditable actions (most recent activity)
  const { data: workflowData, isLoading } = useQuery<{ data: AuditEntry[] }>({
    queryKey: ['audit-log'],
    queryFn: async () => {
      // Build audit trail from multiple sources
      const [wf] = await Promise.all([
        api.get('/workflows?limit=50').then((r) => r.data.data as Array<{
          id: string; workflowType: string; entityType: string; entityId: string;
          submittedBy: string; submittedAt: string; status: string;
        }>),
      ]);
      const entries: AuditEntry[] = wf.map((w) => ({
        id: w.id,
        action: w.status === 'APPROVED' ? 'APPROVE' : w.status === 'REJECTED' ? 'REJECT' : 'CREATE',
        entityType: w.entityType,
        entityId: w.entityId,
        performedBy: w.submittedBy,
        performedAt: w.submittedAt,
      }));
      return { data: entries };
    },
  });

  const entries = workflowData?.data ?? [];
  const filtered = entries.filter((e) => {
    const matchEntity = !entityFilter || e.entityType === entityFilter;
    const matchSearch = !search || e.entityId.includes(search) || e.performedBy.includes(search) || e.action.toLowerCase().includes(search.toLowerCase());
    return matchEntity && matchSearch;
  });

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500">System activity trail for compliance and security</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          <Shield className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">IFRS & Regulatory Compliance View</span>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="Search by entity ID, user or action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            <option value="CONTRACT">Contracts</option>
            <option value="CUSTOMER">Customers</option>
            <option value="INVOICE">Invoices</option>
            <option value="SERVICE_REQUEST">Service Requests</option>
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !filtered.length ? (
              <div className="text-center py-16">
                <Clock className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No audit entries found</p>
                <p className="text-sm text-gray-400">System actions will be recorded here for compliance</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => {
                    const actionMeta = ACTION_META[e.action] ?? ACTION_META.CREATE;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${actionMeta.color}`}>
                            {actionMeta.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-gray-400">{ENTITY_ICON[e.entityType] ?? <FileText className="h-4 w-4" />}</span>
                            {e.entityType.replace(/_/g, ' ')}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{e.entityId.slice(0, 16)}...</TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{e.performedBy.slice(0, 12)}...</TableCell>
                        <TableCell className="text-xs text-gray-400">{formatDate(e.performedAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
