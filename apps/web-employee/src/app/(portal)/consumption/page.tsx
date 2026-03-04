'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Wind, Zap, Droplets, Snowflake, TrendingUp, AlertTriangle, Activity, Gauge } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, StatCard, Badge, formatNumber,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@kezad/ui';
import { api } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const UTILITY_META = {
  GAS:              { label: 'Gas',              color: '#f97316', gradient: ['#fed7aa', '#f97316'], icon: <Wind className="h-4 w-4" />,      bg: 'bg-orange-100 text-orange-700', unit: 'MMBTU' },
  POWER:            { label: 'Power',            color: '#3b82f6', gradient: ['#bfdbfe', '#3b82f6'], icon: <Zap className="h-4 w-4" />,       bg: 'bg-blue-100 text-blue-700',     unit: 'kWh' },
  WATER:            { label: 'Water',            color: '#06b6d4', gradient: ['#a5f3fc', '#06b6d4'], icon: <Droplets className="h-4 w-4" />,  bg: 'bg-cyan-100 text-cyan-700',     unit: 'm³' },
  DISTRICT_COOLING: { label: 'District Cooling', color: '#8b5cf6', gradient: ['#c4b5fd', '#8b5cf6'], icon: <Snowflake className="h-4 w-4" />, bg: 'bg-violet-100 text-violet-700', unit: 'RTh' },
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
  const avgDaily = dailyData.length > 0 ? totalConsumption / dailyData.length : 0;

  const meta = UTILITY_META[selectedUtility as keyof typeof UTILITY_META] ?? UTILITY_META.POWER;

  return (
    <div className="animate-fade-in">
      <div className="kezad-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Consumption Analytics</h1>
          <p className="text-sm text-gray-500">Monitor SCADA meter data across all utility types</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-sm border rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                selectedUtility === key
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:shadow-sm'
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard title="Total Consumption" value={formatNumber(totalConsumption, 1)} subtitle={meta.unit} icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard title="Daily Average" value={formatNumber(avgDaily, 1)} subtitle={`${meta.unit}/day`} icon={<Gauge className="h-5 w-5" />} />
          <StatCard title="Data Points" value={totalPoints.toLocaleString()} subtitle={`${days}-day window`} icon={<Activity className="h-5 w-5" />} />
          <StatCard title="Data Quality" value={`${qualityPct}%`} subtitle="GOOD readings" icon={<TrendingUp className="h-5 w-5" />} variant={parseFloat(qualityPct) >= 95 ? 'success' : 'warning'} />
          <StatCard title={`${meta.label} Meters`} value={filteredMeters.length} subtitle={`${filteredMeters.filter((m) => m.isActive).length} active`} icon={<AlertTriangle className="h-5 w-5" />} />
        </div>

        {/* Chart */}
        <Card>
          <CardHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Daily {meta.label} Consumption</CardTitle>
              {dailyData.length > 0 && (
                <span className="text-xs text-gray-400">{dailyData.length} data points</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingData ? (
              <div className="h-72 bg-gray-50 rounded-xl animate-pulse flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dailyData.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-gray-400">
                <BarChart3 className="h-14 w-14 text-gray-200 mb-3" />
                <p className="font-medium text-gray-500">No consumption data</p>
                <p className="text-sm mt-1">Generate SCADA data from the Meters page to see readings here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id={`grad-${selectedUtility}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={meta.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={meta.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [formatNumber(v as number, 2) + ' ' + meta.unit, meta.label]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 13 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={meta.color}
                    strokeWidth={2.5}
                    fill={`url(#grad-${selectedUtility})`}
                    dot={dailyData.length <= 31 ? { r: 3, fill: meta.color, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: meta.color, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
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
