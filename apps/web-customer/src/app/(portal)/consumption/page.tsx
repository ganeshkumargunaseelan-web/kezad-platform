'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, Badge, InfoBanner, formatNumber,
} from '@kezad/ui';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart,
} from 'recharts';

const UTILITY_COLORS = {
  GAS: '#f97316',
  POWER: '#3b82f6',
  WATER: '#06b6d4',
  DISTRICT_COOLING: '#8b5cf6',
};

export default function ConsumptionPage() {
  const [selectedUtility, setSelectedUtility] = useState('POWER');
  const [days, setDays] = useState(30);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

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
      id: string; meterCode: string; meterType: string; location: string;
    }>),
  });

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
  const qualityPct = totalPoints > 0 ? ((goodQuality / totalPoints) * 100).toFixed(1) : '—';

  // High consumption alert detection
  const avgDaily = dailyData.length > 0 ? totalConsumption / dailyData.length : 0;
  const HIGH_THRESHOLD = 1.5; // 50% above average
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
      message: `${highDays.length} day${highDays.length > 1 ? 's' : ''} exceeded 150% of your ${days}-day average. Peak was ${formatNumber(peakDay.value, 2)} ${consumptionData?.[0]?.unit ?? ''} on ${peakDay.date} (${pctAbove}% above average). Please verify your usage or check for meter anomalies.`,
    });
  }
  if (badQualityPct > 10) {
    alerts.push({
      id: 'data-quality',
      variant: 'error',
      title: 'Data Quality Alert',
      message: `${badQualityPct.toFixed(1)}% of readings (${badQualityCount} of ${totalPoints}) are flagged as non-GOOD quality. Billing calculations may be affected. Please contact support if this persists.`,
    });
  }
  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));

  return (
    <div className="animate-fade-in">
      <Header title="Consumption" subtitle="Monitor your utility consumption data" />

      <div className="p-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {(['GAS', 'POWER', 'WATER', 'DISTRICT_COOLING'] as const).map((ut) => (
            <button
              key={ut}
              onClick={() => setSelectedUtility(ut)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedUtility === ut
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {ut}
            </button>
          ))}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="ml-auto px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* Consumption Alerts */}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Consumption</p>
                  <p className="text-xl font-bold">{formatNumber(totalConsumption, 2)}</p>
                  <p className="text-xs text-gray-400">{consumptionData?.[0]?.unit ?? '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data Quality</p>
                  <p className="text-xl font-bold">{qualityPct}%</p>
                  <p className="text-xs text-gray-400">{goodQuality} / {totalPoints} GOOD readings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Meters</p>
                  <p className="text-xl font-bold">{meters?.length ?? 0}</p>
                  <p className="text-xs text-gray-400">{selectedUtility} meters registered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Consumption Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily {selectedUtility} Consumption</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [formatNumber(v as number), consumptionData?.[0]?.unit ?? '']} />
                <Bar
                  dataKey="value"
                  fill={UTILITY_COLORS[selectedUtility as keyof typeof UTILITY_COLORS] ?? '#3b82f6'}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Meter List */}
        {meters && meters.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Registered Meters</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {meters.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.meterCode}</p>
                      <p className="text-xs text-gray-400">{m.meterType} · {m.location}</p>
                    </div>
                    <Badge variant="success" className="ml-auto">Active</Badge>
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
