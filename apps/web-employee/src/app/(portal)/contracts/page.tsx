'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Zap, Droplets, Wind, Snowflake, ArrowRight, Filter } from 'lucide-react';
import {
  Card, CardContent, Badge, statusVariant, StatCard,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Button, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';

const UTILITY_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  GAS:              { icon: <Wind className="h-4 w-4" />,      color: 'bg-orange-100 text-orange-700', label: 'Gas' },
  POWER:            { icon: <Zap className="h-4 w-4" />,       color: 'bg-blue-100 text-blue-700',    label: 'Power' },
  WATER:            { icon: <Droplets className="h-4 w-4" />,  color: 'bg-cyan-100 text-cyan-700',    label: 'Water' },
  DISTRICT_COOLING: { icon: <Snowflake className="h-4 w-4" />, color: 'bg-sky-100 text-sky-700',     label: 'Cooling' },
};

interface Contract {
  id: string;
  contractNumber: string;
  utilityType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  customer?: { companyName: string; customerCode: string };
  gasDetails?: { dcq: string };
  powerDetails?: { contractedKw: string };
  waterDetails?: { contractedM3: string };
  coolingDetails?: { contractedRt: string };
}

function getCapacity(c: Contract): string {
  if (c.gasDetails?.dcq) return `${parseFloat(c.gasDetails.dcq).toLocaleString()} MMBTU/d`;
  if (c.powerDetails?.contractedKw) return `${parseFloat(c.powerDetails.contractedKw).toLocaleString()} kW`;
  if (c.waterDetails?.contractedM3) return `${parseFloat(c.waterDetails.contractedM3).toLocaleString()} m³`;
  if (c.coolingDetails?.contractedRt) return `${parseFloat(c.coolingDetails.contractedRt).toLocaleString()} RT`;
  return '—';
}

const STATUSES = ['', 'DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED'];
const UTILITY_TYPES = ['', 'GAS', 'POWER', 'WATER', 'DISTRICT_COOLING'];

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [utilityFilter, setUtilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery<{ data: Contract[] }>({
    queryKey: ['contracts', utilityFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (utilityFilter) params.set('utilityType', utilityFilter);
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/contracts?${params.toString()}`).then((r) => r.data);
    },
  });

  const contracts = data?.data ?? [];
  const filtered = contracts.filter((c) =>
    !search ||
    c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.customer?.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === 'ACTIVE').length,
    pending: contracts.filter((c) => c.status === 'PENDING_APPROVAL').length,
    draft: contracts.filter((c) => c.status === 'DRAFT').length,
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500">Manage all utility contracts across customers</p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" /> New Contract
        </Button>
      </div>

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Contracts" value={stats.total} icon={<FileText className="h-5 w-5" />} />
          <StatCard title="Active" value={stats.active} icon={<FileText className="h-5 w-5" />} variant="success" />
          <StatCard title="Pending Approval" value={stats.pending} icon={<FileText className="h-5 w-5" />} variant="warning" />
          <StatCard title="Draft" value={stats.draft} icon={<FileText className="h-5 w-5" />} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              placeholder="Search contract # or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={utilityFilter}
              onChange={(e) => setUtilityFilter(e.target.value)}
            >
              <option value="">All Utilities</option>
              {UTILITY_TYPES.slice(1).map((u) => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
            </select>
            <select
              className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.slice(1).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No contracts found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Utility</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const meta = UTILITY_META[c.utilityType];
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => window.location.href = `/contracts/${c.id}`}>
                        <TableCell className="font-mono text-xs font-semibold text-gray-900">{c.contractNumber}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-gray-900">{c.customer?.companyName ?? '—'}</p>
                          <p className="text-xs text-gray-400">{c.customer?.customerCode}</p>
                        </TableCell>
                        <TableCell>
                          {meta && (
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.color}`}>
                                {meta.icon}
                              </span>
                              <span className="text-sm">{meta.label}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-700">{getCapacity(c)}</TableCell>
                        <TableCell><Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-500">{formatDate(c.startDate)}</TableCell>
                        <TableCell className="text-xs text-gray-500">{c.endDate ? formatDate(c.endDate) : '—'}</TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary" />
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
    </div>
  );
}
