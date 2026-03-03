/**
 * SCADA Adapter Interface (OPC UA — Siemens WinCC / Emerson OpenEnterprise)
 */

export interface ScadaDataPoint {
  meterId: string;
  nodeId: string;
  value: number;
  quality: 'GOOD' | 'BAD' | 'SUSPECT';
  timestamp: Date;
  unit: string;
}

export interface ScadaSubscriptionOptions {
  nodeIds: string[];
  samplingInterval: number; // ms — typically 60000 (1 min) or 900000 (15 min)
  onData: (points: ScadaDataPoint[]) => Promise<void>;
}

export interface IScadaAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  readCurrentValues(nodeIds: string[]): Promise<ScadaDataPoint[]>;
  subscribe(options: ScadaSubscriptionOptions): Promise<() => void>; // returns unsubscribe fn
  ping(): Promise<boolean>;
}
