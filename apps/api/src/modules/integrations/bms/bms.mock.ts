/**
 * Mock BMS Adapter (Modbus TCP/RTU simulation)
 * Simulates District Cooling and Water sub-meter readings.
 */
import type { IBmsAdapter, BmsRegisterReading, BmsPollingOptions } from './bms.interface.js';

export class MockBmsAdapter implements IBmsAdapter {
  private connected = false;
  private intervals: NodeJS.Timeout[] = [];

  async connect(_host: string, _port: number): Promise<void> {
    this.connected = true;
    console.log('[MockBMS] Connected (Modbus TCP simulated)');
  }

  async disconnect(): Promise<void> {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.connected = false;
    console.log('[MockBMS] Disconnected');
  }

  async readRegisters(addresses: number[]): Promise<BmsRegisterReading[]> {
    return addresses.map((addr) => ({
      meterId: `BMS-METER-${addr.toString().padStart(4, '0')}`,
      registerAddress: addr,
      value: parseFloat((Math.random() * 500 + 50).toFixed(3)),
      scaleFactor: 0.1,
      unit: addr % 2 === 0 ? 'ton-hr' : 'm3',
      quality: Math.random() < 0.97 ? 'GOOD' : 'SUSPECT',
      timestamp: new Date(),
    }));
  }

  async startPolling(options: BmsPollingOptions): Promise<() => void> {
    if (!this.connected) await this.connect('127.0.0.1', 502);

    const interval = setInterval(() => {
      const readings: BmsRegisterReading[] = options.registers.map((reg) => ({
        meterId: reg.meterId,
        registerAddress: reg.address,
        value: parseFloat((Math.random() * 400 + 100).toFixed(3)),
        scaleFactor: reg.scaleFactor ?? 1,
        unit: reg.unit,
        quality: Math.random() < 0.97 ? 'GOOD' : 'SUSPECT',
        timestamp: new Date(),
      }));
      void options.onData(readings);
    }, options.intervalMs);

    this.intervals.push(interval);
    return () => clearInterval(interval);
  }

  async ping(): Promise<boolean> {
    return this.connected;
  }
}
