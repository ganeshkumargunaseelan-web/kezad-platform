'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Zap, Droplets, Wind, Snowflake, ArrowRight } from 'lucide-react';
import { Card, CardContent, Badge, statusVariant, formatDate } from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';

interface Contract {
  id: string;
  contractNumber: string;
  utilityType: 'GAS' | 'POWER' | 'WATER' | 'DISTRICT_COOLING';
  status: string;
  startDate: string;
  endDate: string | null;
  gasDetails?: { dcq: string; acq: string };
  powerDetails?: { contractedKw: string };
  waterDetails?: { contractedM3: string };
  coolingDetails?: { contractedRt: string };
}

const UTILITY_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  GAS:              { icon: <Wind className="h-5 w-5" />,      color: 'bg-orange-100 text-orange-700', label: 'Industrial Gas' },
  POWER:            { icon: <Zap className="h-5 w-5" />,       color: 'bg-blue-100 text-blue-700',    label: 'Power' },
  WATER:            { icon: <Droplets className="h-5 w-5" />,  color: 'bg-cyan-100 text-cyan-700',    label: 'Water' },
  DISTRICT_COOLING: { icon: <Snowflake className="h-5 w-5" />, color: 'bg-sky-100 text-sky-700',     label: 'District Cooling' },
};

function getContractSummary(c: Contract): string {
  if (c.utilityType === 'GAS' && c.gasDetails) return `DCQ: ${parseFloat(c.gasDetails.dcq).toLocaleString()} MMBTU/day`;
  if (c.utilityType === 'POWER' && c.powerDetails) return `${parseFloat(c.powerDetails.contractedKw).toLocaleString()} kW contracted`;
  if (c.utilityType === 'WATER' && c.waterDetails) return `${parseFloat(c.waterDetails.contractedM3).toLocaleString()} m³/month`;
  if (c.utilityType === 'DISTRICT_COOLING' && c.coolingDetails) return `${parseFloat(c.coolingDetails.contractedRt).toLocaleString()} RT contracted`;
  return '';
}

export default function ContractsPage() {
  const { data: rawContracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.get('/contracts').then((r) => r.data.data),
  });
  const contracts = Array.isArray(rawContracts) ? (rawContracts as Contract[]) : [];

  return (
    <div className="animate-fade-in">
      <Header title="Contracts" subtitle="View and manage your utility contracts" />

      <div className="p-8 space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : !contracts.length ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No contracts found</p>
            <p className="text-sm text-gray-400">Contact KEZAD to set up your utility contracts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {contracts.map((contract) => {
              const meta = UTILITY_META[contract.utilityType] ?? UTILITY_META['POWER']!;
              return (
                <a key={contract.id} href={`/contracts/${contract.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.color}`}>
                          {meta.icon}
                        </div>
                        <Badge variant={statusVariant(contract.status)}>{contract.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{meta.label}</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">{contract.contractNumber}</p>
                      <p className="text-sm text-gray-500 mt-1">{getContractSummary(contract)}</p>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span>From {formatDate(contract.startDate)}</span>
                        {contract.endDate && <span>To {formatDate(contract.endDate)}</span>}
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
