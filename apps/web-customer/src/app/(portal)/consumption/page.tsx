'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, AlertTriangle, Wind, Zap, Droplets, Snowflake, Gauge, Activity } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, InfoBanner, formatNumber,
} from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import {
  AreaChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line,
} from 'recharts';

const UTILITY_TYPES = [
  { key: 'GAS', label: 'Gas', icon: Wind, color: '#f97316', gradient: ['#fdba74', '#f97316'], bg: 'bg-orange-50', iconBg: 'icon-amber' },
  { key: 'POWER', label: 'Power', icon: Zap, color: '#3b82f6', gradient: ['#93c5fd', '#3b82f6'], bg: 'bg-blue-50', iconBg: 'icon-blue' },
  { key: 'WATER', label: 'Water', icon: Droplets, color: '#06b6d4', gradient: ['#67e8f9', '#06b6d4'], bg: 'bg-cyan-50', iconBg: 'icon-teal' },
  { key: 'DISTRICT_COOLING', label: 'District Cooling', icon: Snowflake, color: '#8b5cf6', gradient: ['#c4b5fd', '#8b5cf6'], bg: 'bg-violet-50', iconBg: 'icon-purple' },
] as const;

const UNIT_LABELS: Record<string, string> = {
  GAS: 'MMBTU', POWER: 'kWh', WATER: 'm³', DISTRICT_COOLING: 'RT·h',
};

export default function ConsumptionPage() {
  const [selectedUtility, setSelectedUtility] = useState('POWER');
  const [days, setDays] = useState(30);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const utilMeta = UTILITY_TYPES.find((u) => u.key === selectedUtility) ?? UTILITY_TYPES[1];
  const UtilIcon = utilMeta.icon;

  const to = new Date().toISOString();
  const from = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: consumptionData } = useQuery({
    queryKey: ['consumption', selectedUtility, days],
    queryFn: () => api.get(`/consumption/data?from=${from}&to=${to}`).then((r) => r.data.data as Array<{
      periodStartUtc: string; rawValue: string; unit: string; qualityFlag: string;
    }>),
  });

  const { data: meters } = useQuery({
    queryKey: ['meters'],
    queryFn: () => api.get('/consumption/meters').then((r) => r.data.data as Array<{
      id: string; meterCode: string; meterType: string; location: string; serialNumber?: string;
    }>),
  });

  const filteredMeters = meters?.filter((m) => m.meterType === selectedUtility) ?? [];

  // Aggregate into daily data for chart
  const dailyData = (() => {
    if (!consumptionData) return [];
    const byDate = new Map<string, number>();
    consumptionData.forEach((dp) => {
      const date = dp.periodStartUtc.split('T')[0] ?? '';
      byDate.set(date, (byDate.get(date) ?? 0) + parseFloat(dp.rawValue));
    });
    const entries = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date: date.slice(5), value: parseFloat(value.toFixed(2)) }));

    // Add 7-day moving average
    return entries.map((entry, i) => {
      const window = entries.slice(Math.max(0, i - 6), i + 1);
      const avg = window.reduce((s, e) => s + e.value, 0) / window.length;
      return { ...entry, avg: parseFloat(avg.toFixed(2)) };
    });
  })();

  const totalConsumption = consumptionData?.reduce((s, d) => s + parseFloat(d.rawValue), 0) ?? 0;
  const goodQuality = consumptionData?.filter((d) => d.qualityFlag === 'GOOD').length ?? 0;
  const totalPoints = consumptionData?.length ?? 0;
  const qualityPct = totalPoints > 0 ? ((goodQuality / totalPoints) * 100).toFixed(1) : '—';
  const avgDaily = dailyData.length > 0 ? totalConsumption / dailyData.length : 0;
  const unit = consumptionData?.[0]?.unit ?? UNIT_LABELS[selectedUtility] ?? '';

  // High consumption alert detection
  const HIGH_THRESHOLD = 1.5;
  const highDays = avgDaily > 0
    ? dailyData.filter((d) => d.value >= avgDaily * HIGH_THRESHOLD)
    : [];
  const peakDay = dailyData.reduce<{ date: string; value: number } | null>(
    (best, d) => (!best || d.value > best.value ? d : best),
    null,
  );
  const badQualityCount = totalPoints - goodQuality;
  const badQualityPct = totalPoints > 0 ? (badQualityCount / totalPoints) * 100 : 0;

  type Alert = { id: string; variant: 'warning' | 'error'; title: string; message: string };
  const alerts: Alert[] = [];
  if (highDays.length > 0 && peakDay) {
    const pctAbove = avgDaily > 0 ? (((peakDay.value - avgDaily) / avgDaily) * 100).toFixed(0) : '0';
    alerts.push({
      id: 'high-consumption',
      variant: 'warning',
      title: 'High Consumption Detected',
      message: `${highDays.length} day${highDays.length > 1 ? 's' : ''} exceeded 150% of your ${days}-day average. Peak was ${formatNumber(peakDay.value, 2)} ${unit} on ${peakDay.date} (${pctAbove}% above average).`,
    });
  }
  if (badQualityPct > 10) {
    alerts.push({
      id: 'data-quality',
      variant: 'error',
      title: 'Data Quality Alert',
      message: `${badQualityPct.toFixed(1)}% of readings (${badQualityCount} of ${totalPoints}) are flagged as non-GOOD quality. Billing calculations may be affected.`,
    });
  }
  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const main = payload.find((p) => p.dataKey === 'value');
    const avg = payload.find((p) => p.dataKey === 'avg');
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[160px]">
        <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
        {main && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: utilMeta.color }} />
              <span className="text-xs text-gray-500">Consumption</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{formatNumber(main.value, 2)} <span className="text-xs font-normal text-gray-400">{unit}</span></span>
          </div>
        )}
        {avg && (
          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-500">7-day Avg</span>
            </div>
            <span className="text-sm font-medium text-gray-600">{formatNumber(avg.value, 2)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <Header title="Consumption" subtitle="Monitor your utility consumption data" />

      <div className="p-8 space-y-6">
        {/* Utility Type Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white rounded-xl border border-gray-200 p-1 gap-1">
            {UTILITY_TYPES.map((ut) => {
              const Icon = ut.icon;
              const active = selectedUtility === ut.key;
              return (
                <button
                  key={ut.key}
                  onClick={() => setSelectedUtility(ut.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={active ? { background: ut.color } : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {ut.label}
                </button>
              );
            })}
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="ml-auto px-4 py-2 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* Alerts */}
        {visibleAlerts.length > 0 && (
          <div className="space-y-3">
            {visibleAlerts.map((alert) => (
              <InfoBanner
                key={alert.id}
                variant={alert.variant}
                title={alert.title}
                message={alert.message}
                onDismiss={() => setDismissedAlerts((prev) => [...prev, alert.id])}
              />
            ))}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Consumption</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalConsumption, 0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{unit}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${utilMeta.iconBg}`}>
                  <UtilIcon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Daily Average</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(avgDaily, 0)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{unit} / day</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Data Quality</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{qualityPct}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">{goodQuality} / {totalPoints} readings</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Active Meters</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{filteredMeters.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{utilMeta.label} meters</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600">
                  <Gauge className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consumption Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <CardTitle className="text-base">Daily {utilMeta.label} Consumption</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">With 7-day moving average trend line</p>
            </div>
            {peakDay && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Peak Day</p>
                <p className="text-sm font-bold" style={{ color: utilMeta.color }}>{formatNumber(peakDay.value, 0)} {unit}</p>
                <p className="text-xs text-gray-400">{peakDay.date}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id={`gradient-${selectedUtility}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={utilMeta.gradient[0]} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={utilMeta.gradient[1]} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  fill={`url(#gradient-${selectedUtility})`}
                  stroke={utilMeta.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: utilMeta.color, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  dot={false}
                  name="7-day Avg"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Meter List */}
        {filteredMeters.length > 0 && (
          <Card>
            <CardHeader className="px-6 py-4 border-b border-gray-50">
              <CardTitle className="text-base">{utilMeta.label} Meters</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMeters.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${utilMeta.iconBg}`}>
                      <Gauge className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{m.meterCode}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{m.location}</p>
                      {m.serialNumber && <p className="text-xs text-gray-300 mt-0.5 font-mono">{m.serialNumber}</p>}
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
