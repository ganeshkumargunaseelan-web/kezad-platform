'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Wind, Zap, Droplets, Snowflake, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, StatCard, Badge, formatNumber,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, formatDate,
} from '@kezad/ui';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const UTILITY_META = {
  GAS:              { label: 'Gas',              color: '#f97316', icon: <Wind className="h-4 w-4" />,      bg: 'bg-orange-100 text-orange-700' },
  POWER:            { label: 'Power',            color: '#3b82f6', icon: <Zap className="h-4 w-4" />,       bg: 'bg-blue-100 text-blue-700' },
  WATER:            { label: 'Water',            color: '#06b6d4', icon: <Droplets className="h-4 w-4" />,  bg: 'bg-cyan-100 text-cyan-700' },
  DISTRICT_COOLING: { label: 'District Cooling', color: '#8b5cf6', icon: <Snowflake className="h-4 w-4" />, bg: 'bg-sky-100 text-sky-700' },
};

interface Meter {
  id: string;
  meterCode: string;
  meterType: string;
  serialNumber: string | null;
  location: string | null;
  scadaNodeId: string | null;
  isActive: boolean;
  _count?: { dataPoints: number; manualReadings: number };
}

interface DataPoint {
  periodStartUtc: string;
  rawValue: string;
  unit: string;
  qualityFlag: string;
}

export default function ConsumptionPage() {
  const [selectedUtility, setSelectedUtility] = useState('POWER');
  const [days, setDays] = useState(30);

  const to = new Date().toISOString();
  const from = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: consumptionData, isLoading: loadingData } = useQuery<DataPoint[]>({
    queryKey: ['emp-consumption', selectedUtility, days],
    queryFn: () => api.get(`/consumption/data?from=${from}&to=${to}`).then((r) => r.data.data),
  });

  const { data: metersData } = useQuery<{ data: Meter[] }>({
    queryKey: ['meters'],
    queryFn: () => api.get('/consumption/meters').then((r) => r.data),
  });

  const meters = metersData?.data ?? [];
  const filteredMeters = meters.filter((m) => m.meterType === selectedUtility);

  // Aggregate into daily data for chart
  const dailyData = (() => {
    if (!consumptionData) return [];
    const byDate = new Map<string, number>();
    consumptionData.forEach((dp) => {
      const date = dp.periodStartUtc.split('T')[0] ?? '';
      byDate.set(date, (byDate.get(date) ?? 0) + parseFloat(dp.rawValue));
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date: date.slice(5), value: parseFloat(value.toFixed(2)) }));
  })();

  const totalConsumption = consumptionData?.reduce((s, d) => s + parseFloat(d.rawValue), 0) ?? 0;
  const goodQuality = consumptionData?.filter((d) => d.qualityFlag === 'GOOD').length ?? 0;
  const totalPoints = consumptionData?.length ?? 0;
  const qualityPct = totalPoints > 0 ? ((goodQuality / totalPoints) * 100).toFixed(1) : '0';

  const meta = UTILITY_META[selectedUtility as keyof typeof UTILITY_META] ?? UTILITY_META.POWER;

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Consumption Analytics</h1>
          <p className="text-sm text-gray-500">Monitor SCADA meter data across all utility types</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="p-8 space-y-6">
        {/* Utility Type Filters */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(UTILITY_META) as [string, typeof UTILITY_META.GAS][]).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setSelectedUtility(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                selectedUtility === key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="Total Consumption" value={formatNumber(totalConsumption, 2)} subtitle={consumptionData?.[0]?.unit ?? '—'} icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard title="Data Points" value={totalPoints.toLocaleString()} subtitle={`${days}-day window`} icon={<Activity className="h-5 w-5" />} />
          <StatCard title="Data Quality" value={`${qualityPct}%`} subtitle="GOOD readings" icon={<TrendingUp className="h-5 w-5" />} variant={parseFloat(qualityPct) >= 95 ? 'success' : 'warning'} />
          <StatCard title={`${meta.label} Meters`} value={filteredMeters.length} subtitle={`${filteredMeters.filter((m) => m.isActive).length} active`} icon={<AlertTriangle className="h-5 w-5" />} />
        </div>

        {/* Chart */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-base">Daily {meta.label} Consumption</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loadingData ? (
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
            ) : dailyData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <BarChart3 className="h-12 w-12 text-gray-200 mb-3" />
                <p className="font-medium">No consumption data</p>
                <p className="text-sm mt-1">Generate SCADA data from the Meters page to see readings here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [formatNumber(v as number), consumptionData?.[0]?.unit ?? '']} />
                  <Bar dataKey="value" fill={meta.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Meter Breakdown */}
        {filteredMeters.length > 0 && (
          <Card>
            <CardHeader className="px-6 py-4 border-b">
              <CardTitle className="text-base">{meta.label} Meters ({filteredMeters.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meter Code</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>SCADA Node</TableHead>
                    <TableHead>Data Points</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeters.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs font-semibold">{m.meterCode}</TableCell>
                      <TableCell className="text-sm text-gray-500">{m.serialNumber ?? '—'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{m.location ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{m.scadaNodeId ?? '—'}</TableCell>
                      <TableCell className="font-medium">{(m._count?.dataPoints ?? 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={m.isActive ? 'success' : 'secondary'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
