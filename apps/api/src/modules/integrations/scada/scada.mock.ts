/**
 * Mock SCADA Adapter
 * Generates realistic industrial meter data with:
 * - Daily load profiles (peak/off-peak simulation)
 * - Random ±5% noise
 * - Occasional quality issues (1% BAD, 3% SUSPECT)
 * - Cumulative register simulation with roll-over at 999999
 */
import type { IScadaAdapter, ScadaDataPoint, ScadaSubscriptionOptions } from './scada.interface.js';

const UTILITY_PROFILES: Record<string, { baseLoad: number; unit: string; peakHours: number[] }> = {
  GAS: { baseLoad: 1200, unit: 'Sm3/h', peakHours: [6, 7, 8, 9, 17, 18, 19, 20] },
  POWER: { baseLoad: 5500, unit: 'kWh', peakHours: [8, 9, 10, 11, 12, 13, 14, 15, 16] },
  WATER: { baseLoad: 85, unit: 'm3/h', peakHours: [6, 7, 8, 12, 13, 18, 19] },
  COOLING: { baseLoad: 320, unit: 'ton-hr', peakHours: [10, 11, 12, 13, 14, 15, 16] },
};

const cumulativeRegisters = new Map<string, number>();

function generateReading(nodeId: string, hour: number): ScadaDataPoint {
  // Extract utility type from node ID pattern: SCADA/GAS/METER-001
  const parts = nodeId.split('/');
  const utilityKey = parts[1] ?? 'POWER';
  const profile = UTILITY_PROFILES[utilityKey] ?? UTILITY_PROFILES['POWER']!;

  const isPeak = profile.peakHours.includes(hour);
  const loadFactor = isPeak ? 1.35 : 0.75;
  const noise = 1 + (Math.random() - 0.5) * 0.10; // ±5% noise
  const value = parseFloat((profile.baseLoad * loadFactor * noise).toFixed(3));

  // Cumulative register
  const prev = cumulativeRegisters.get(nodeId) ?? Math.floor(Math.random() * 100000);
  const cumulative = (prev + value) % 999999;
  cumulativeRegisters.set(nodeId, cumulative);

  // Quality simulation
  const rand = Math.random();
  const quality: 'GOOD' | 'BAD' | 'SUSPECT' = rand < 0.01 ? 'BAD' : rand < 0.04 ? 'SUSPECT' : 'GOOD';

  return {
    meterId: parts[2] ?? nodeId,
    nodeId,
    value: quality === 'BAD' ? 0 : value,
    quality,
    timestamp: new Date(),
    unit: profile.unit,
  };
}

export class MockScadaAdapter implements IScadaAdapter {
  private connected = false;
  private intervals: NodeJS.Timeout[] = [];

  async connect(): Promise<void> {
    this.connected = true;
    console.log('[MockSCADA] Connected (OPC UA simulated)');
  }

  async disconnect(): Promise<void> {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.connected = false;
    console.log('[MockSCADA] Disconnected');
  }

  async readCurrentValues(nodeIds: string[]): Promise<ScadaDataPoint[]> {
    const hour = new Date().getUTCHours();
    return nodeIds.map((id) => generateReading(id, hour));
  }

  async subscribe(options: ScadaSubscriptionOptions): Promise<() => void> {
    if (!this.connected) await this.connect();

    const interval = setInterval(() => {
      const hour = new Date().getUTCHours();
      const points = options.nodeIds.map((id) => generateReading(id, hour));
      void options.onData(points);
    }, options.samplingInterval);

    this.intervals.push(interval);

    return () => clearInterval(interval);
  }

  async ping(): Promise<boolean> {
    return this.connected;
  }
}
