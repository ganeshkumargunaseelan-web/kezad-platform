/**
 * BMS Adapter Interface (Modbus TCP/RTU — Tridium Niagara / Honeywell N4)
 */

export interface BmsRegisterReading {
  meterId: string;
  registerAddress: number;
  value: number;
  scaleFactor: number;
  unit: string;
  quality: 'GOOD' | 'BAD' | 'SUSPECT';
  timestamp: Date;
}

export interface BmsPollingOptions {
  registers: Array<{ meterId: string; address: number; unit: string; scaleFactor?: number }>;
  intervalMs: number;
  onData: (readings: BmsRegisterReading[]) => Promise<void>;
}

export interface IBmsAdapter {
  connect(host: string, port: number): Promise<void>;
  disconnect(): Promise<void>;
  readRegisters(addresses: number[]): Promise<BmsRegisterReading[]>;
  startPolling(options: BmsPollingOptions): Promise<() => void>;
  ping(): Promise<boolean>;
}
