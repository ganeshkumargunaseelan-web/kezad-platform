/**
 * KEZAD Platform — Database Seed
 * Populates the database with realistic demo data for development.
 *
 * Run: cd packages/database && npx prisma db seed
 */
import { PrismaClient } from '../generated/client/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding KEZAD Platform database...');

  // ─── Clean slate (delete in FK dependency order) ──────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.workflowAction.deleteMany();
  await prisma.workflowInstance.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.billingDispute.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.billingAdjustment.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.billingRun.deleteMany();
  await prisma.touPeriod.deleteMany();
  await prisma.tariffRate.deleteMany();
  await prisma.tariffTier.deleteMany();
  await prisma.tariff.deleteMany();
  await prisma.meterDataPoint.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.meter.deleteMany();
  await prisma.consumptionProfile.deleteMany();
  await prisma.nominatedQuantity.deleteMany();
  await prisma.yearEndReconciliation.deleteMany();
  await prisma.overtakeRecord.deleteMany();
  await prisma.topShortfall.deleteMany();
  await prisma.gasContractDetail.deleteMany();
  await prisma.powerContractDetail.deleteMany();
  await prisma.waterContractDetail.deleteMany();
  await prisma.coolingContractDetail.deleteMany();
  await prisma.contractVersion.deleteMany();
  await prisma.contractAmendment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.customerDocument.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.reportSnapshot.deleteMany();
  await prisma.mockScadaDatapoint.deleteMany();
  await prisma.mockBmsDatapoint.deleteMany();

  console.log('  ✓ Cleared existing data');

  // ─── Staff Users ──────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Password123!', SALT_ROUNDS);

  const superAdmin = await prisma.user.create({
    data: { email: 'superadmin@kezad.ae', passwordHash: hashedPassword, firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', isActive: true },
  });
  const admin = await prisma.user.create({
    data: { email: 'admin@kezad.ae', passwordHash: hashedPassword, firstName: 'Ahmed', lastName: 'Al Mansouri', role: 'ADMIN', isActive: true },
  });
  await prisma.user.create({
    data: { email: 'manager@kezad.ae', passwordHash: hashedPassword, firstName: 'Fatima', lastName: 'Al Hashmi', role: 'MANAGER', isActive: true },
  });
  await prisma.user.create({
    data: { email: 'operator@kezad.ae', passwordHash: hashedPassword, firstName: 'Mohammed', lastName: 'Al Mazrouei', role: 'OPERATOR', isActive: true },
  });

  console.log('  ✓ Created staff users (4)');

  // ─── Customer Users ───────────────────────────────────────────────────────
  const [cu1, cu2, cu3] = await Promise.all([
    prisma.user.create({ data: { email: 'procurement@globalsteel.ae', passwordHash: hashedPassword, firstName: 'James', lastName: 'Wilson', role: 'CUSTOMER', isActive: true } }),
    prisma.user.create({ data: { email: 'utilities@petrochemicalabu.ae', passwordHash: hashedPassword, firstName: 'Sarah', lastName: 'Ahmed', role: 'CUSTOMER', isActive: true } }),
    prisma.user.create({ data: { email: 'facilities@AlHamraMfg.ae', passwordHash: hashedPassword, firstName: 'Ali', lastName: 'Hassan', role: 'CUSTOMER', isActive: true } }),
  ]);

  // ─── Customer Records ─────────────────────────────────────────────────────
  const [cust1, cust2, cust3] = await Promise.all([
    prisma.customer.create({
      data: {
        userId: cu1!.id,
        customerCode: 'KUFM-00001',
        companyName: 'Global Steel Industries LLC',
        tradeLicenseNo: 'CN-12345678',
        vatRegistrationNo: '100123456700001',
        industry: 'Steel Manufacturing',
        address: { street: 'Plot 12, Zone A', city: 'Abu Dhabi', emirate: 'Abu Dhabi', country: 'AE' },
        crmExternalId: 'CRM-ACCOUNT-001',
        isActive: true,
      },
    }),
    prisma.customer.create({
      data: {
        userId: cu2!.id,
        customerCode: 'KUFM-00002',
        companyName: 'Abu Dhabi Petrochemical Complex',
        tradeLicenseNo: 'CN-87654321',
        vatRegistrationNo: '100234567800002',
        industry: 'Petrochemicals',
        address: { street: 'Plot 45, Zone C', city: 'Abu Dhabi', emirate: 'Abu Dhabi', country: 'AE' },
        crmExternalId: 'CRM-ACCOUNT-002',
        isActive: true,
      },
    }),
    prisma.customer.create({
      data: {
        userId: cu3!.id,
        customerCode: 'KUFM-00003',
        companyName: 'Al Hamra Manufacturing Co.',
        tradeLicenseNo: 'CN-23456789',
        vatRegistrationNo: '100345678900003',
        industry: 'Light Manufacturing',
        address: { street: 'Plot 78, Zone B', city: 'Abu Dhabi', emirate: 'Abu Dhabi', country: 'AE' },
        isActive: true,
      },
    }),
  ]);

  await prisma.customerContact.createMany({
    data: [
      { customerId: cust1!.id, name: 'James Wilson', role: 'Primary', email: 'procurement@globalsteel.ae', phone: '+971 50 111 2222', isPrimary: true },
      { customerId: cust1!.id, name: 'Mark Thompson', role: 'Billing', email: 'billing@globalsteel.ae', phone: '+971 50 333 4444', isPrimary: false },
      { customerId: cust2!.id, name: 'Sarah Ahmed', role: 'Primary', email: 'utilities@petrochemicalabu.ae', phone: '+971 50 555 6666', isPrimary: true },
      { customerId: cust3!.id, name: 'Ali Hassan', role: 'Primary', email: 'facilities@AlHamraMfg.ae', phone: '+971 50 777 8888', isPrimary: true },
    ],
  });

  console.log('  ✓ Created customers (3) with contacts');

  // ─── Contracts ────────────────────────────────────────────────────────────
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2027-12-31');

  const gasContract = await prisma.contract.create({
    data: {
      contractNumber: 'KUFM-GAS-2025-001',
      customerId: cust2!.id,
      utilityType: 'GAS',
      status: 'ACTIVE',
      startDate,
      endDate,
      siteAddress: 'Zone C, KEZAD Gas Zone, Abu Dhabi',
      gasDetails: {
        create: {
          dcq: '50000.000000',
          acq: '18000000.000000',
          basePrice: '12.500000',
          serviceCharge: '1.250000',
          overtakeSurcharge: '15.000000',
          topThresholdPct: '95.000000',
          overtakeThresholdPct: '105.000000',
          monthlyFlexPct: '10.000000',
          monthlyCapPct: '105.000000',
          maxReductionPctYear1_2: '25.000000',
          maxReductionPctAfter: '15.000000',
          priceEscalationPct: '3.000000',
          escalationFrequency: 'ANNUAL',
          contractYear: 1,
          noticeRequiredDays: 140,
        },
      },
    },
  });

  const powerContract = await prisma.contract.create({
    data: {
      contractNumber: 'KUFM-PWR-2025-001',
      customerId: cust1!.id,
      utilityType: 'POWER',
      status: 'ACTIVE',
      startDate,
      endDate,
      siteAddress: 'Zone A, KEZAD Industrial Area, Abu Dhabi',
      powerDetails: {
        create: {
          contractedKw: '5000.000000',
          touEnabled: true,
          peakHoursStart: '08:00',
          peakHoursEnd: '20:00',
        },
      },
    },
  });

  const waterContract = await prisma.contract.create({
    data: {
      contractNumber: 'KUFM-WTR-2025-001',
      customerId: cust3!.id,
      utilityType: 'WATER',
      status: 'ACTIVE',
      startDate,
      endDate,
      siteAddress: 'Zone B, KEZAD Light Industrial, Abu Dhabi',
      waterDetails: {
        create: {
          contractedM3: '6000.000000',
          tieredRates: true,
        },
      },
    },
  });

  const coolingContract = await prisma.contract.create({
    data: {
      contractNumber: 'KUFM-CLG-2025-001',
      customerId: cust1!.id,
      utilityType: 'DISTRICT_COOLING',
      status: 'ACTIVE',
      startDate,
      endDate,
      siteAddress: 'Zone A, KEZAD Industrial Area, Abu Dhabi',
      coolingDetails: {
        create: {
          contractedRt: '500.000000',
          contractedTonHours: '4000.000000',
          capacityChargePerRt: '85.000000',
          consumptionChargePerTh: '0.950000',
        },
      },
    },
  });

  await Promise.all([gasContract, powerContract, waterContract, coolingContract].map((c) =>
    prisma.contractVersion.create({
      data: {
        contractId: c.id,
        version: 1,
        snapshotData: { contractNumber: c.contractNumber, status: c.status },
        changedBy: admin.id,
        reason: 'Initial contract creation',
      },
    }),
  ));

  console.log('  ✓ Created contracts (4): Gas, Power, Water, Cooling');

  // ─── Tariffs ──────────────────────────────────────────────────────────────
  await prisma.tariff.createMany({
    data: [
      { name: 'Industrial Gas Tariff 2025', utilityType: 'GAS', tariffType: 'VOLUME_BASED', effectiveFrom: startDate, isActive: true, createdBy: admin.id },
      { name: 'Power TOU Tariff 2025', utilityType: 'POWER', tariffType: 'TIME_OF_USE', effectiveFrom: startDate, isActive: true, createdBy: admin.id },
      { name: 'Water Tiered Tariff 2025', utilityType: 'WATER', tariffType: 'MULTI_TIER', effectiveFrom: startDate, isActive: true, createdBy: admin.id },
      { name: 'District Cooling Tariff 2025', utilityType: 'DISTRICT_COOLING', tariffType: 'DUAL_STRUCTURE', effectiveFrom: startDate, isActive: true, createdBy: admin.id },
    ],
  });

  console.log('  ✓ Created tariffs (4)');

  // ─── Meters ───────────────────────────────────────────────────────────────
  const meters = await Promise.all([
    prisma.meter.create({ data: { contractId: gasContract.id, meterCode: 'MTR-GAS-0001', meterType: 'GAS', serialNumber: 'GAS-SN-001', location: 'Zone C Gate 1', isActive: true } }),
    prisma.meter.create({ data: { contractId: gasContract.id, meterCode: 'MTR-GAS-0002', meterType: 'GAS', serialNumber: 'GAS-SN-002', location: 'Zone C Gate 2', isActive: true } }),
    prisma.meter.create({ data: { contractId: powerContract.id, meterCode: 'MTR-PWR-0001', meterType: 'POWER', serialNumber: 'PWR-SN-001', location: 'Zone A Substation', isActive: true } }),
    prisma.meter.create({ data: { contractId: waterContract.id, meterCode: 'MTR-WTR-0001', meterType: 'WATER', serialNumber: 'WTR-SN-001', location: 'Zone B Inlet', isActive: true } }),
    prisma.meter.create({ data: { contractId: coolingContract.id, meterCode: 'MTR-CLG-0001', meterType: 'COOLING', serialNumber: 'CLG-SN-001', location: 'Zone A CHP', isActive: true } }),
  ]);

  console.log('  ✓ Created meters (5)');

  // ─── Meter Data Points (30 days of hourly data) ───────────────────────────
  const now = new Date();
  const dataPoints: Array<{
    meterId: string; periodStartUtc: Date; periodEndUtc: Date;
    rawValue: string; unit: string; qualityFlag: string;
    sourceSystem: string; checksum: string;
  }> = [];

  for (let day = 29; day >= 0; day--) {
    for (let hour = 0; hour < 24; hour++) {
      const start = new Date(now);
      start.setDate(start.getDate() - day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1);

      const isPeak = hour >= 8 && hour < 20;
      const rand = () => 0.9 + Math.random() * 0.2;

      const gasVal = (2000 * (isPeak ? 1.2 : 0.8) * rand()).toFixed(6);
      dataPoints.push({
        meterId: meters[0]!.id,
        periodStartUtc: start,
        periodEndUtc: end,
        rawValue: gasVal,
        unit: 'MMBTU',
        qualityFlag: Math.random() < 0.97 ? 'GOOD' : 'SUSPECT',
        sourceSystem: 'mock_scada',
        checksum: `${meters[0]!.id}_${end.toISOString()}_${gasVal}`,
      });

      const pwrVal = (220 * (isPeak ? 1.4 : 0.6) * rand()).toFixed(6);
      dataPoints.push({
        meterId: meters[2]!.id,
        periodStartUtc: start,
        periodEndUtc: end,
        rawValue: pwrVal,
        unit: 'KWH',
        qualityFlag: 'GOOD',
        sourceSystem: 'mock_scada',
        checksum: `${meters[2]!.id}_${end.toISOString()}_${pwrVal}`,
      });
    }
  }

  for (let i = 0; i < dataPoints.length; i += 1000) {
    await prisma.meterDataPoint.createMany({ data: dataPoints.slice(i, i + 1000), skipDuplicates: true });
  }

  console.log(`  ✓ Inserted ${dataPoints.length} meter data points (30 days)`);

  // ─── Billing Run & Invoices ────────────────────────────────────────────────
  const periodFrom = new Date('2026-01-01');
  const periodToDate = new Date('2026-01-31');

  const billingRun = await prisma.billingRun.create({
    data: {
      runCode: 'BR-2026-01-001',
      periodFrom,
      periodTo: periodToDate,
      utilityTypes: ['GAS', 'POWER', 'WATER', 'DISTRICT_COOLING'],
      status: 'COMPLETED',
      totalInvoices: 4,
      totalAmount: '285420.000000',
      startedAt: new Date('2026-02-01T08:00:00Z'),
      completedAt: new Date('2026-02-01T08:05:32Z'),
      triggeredBy: admin.id,
    },
  });

  const invoiceBase = { billingRunId: billingRun.id, periodFrom, periodTo: periodToDate, issueDate: new Date('2026-02-01'), currency: 'AED', vatPct: '5.000000' };
  const dueDate = new Date('2026-03-01');

  const gasInvoice = await prisma.invoice.create({
    data: {
      ...invoiceBase,
      invoiceNumber: 'INV-GAS-2026-0001',
      contractId: gasContract.id,
      utilityType: 'GAS',
      dueDate,
      subtotal: '112500.000000',
      vatAmount: '5625.000000',
      totalAmount: '118125.000000',
      paidAmount: '118125.000000',
      outstandingAmount: '0.000000',
      status: 'PAID',
    },
  });

  const powerInvoice = await prisma.invoice.create({
    data: {
      ...invoiceBase,
      invoiceNumber: 'INV-PWR-2026-0001',
      contractId: powerContract.id,
      utilityType: 'POWER',
      dueDate,
      subtotal: '95238.000000',
      vatAmount: '4761.900000',
      totalAmount: '99999.900000',
      paidAmount: '0.000000',
      outstandingAmount: '99999.900000',
      status: 'SENT',
    },
  });

  await prisma.invoice.create({
    data: {
      ...invoiceBase,
      invoiceNumber: 'INV-WTR-2026-0001',
      contractId: waterContract.id,
      utilityType: 'WATER',
      dueDate: new Date('2026-02-15'),
      subtotal: '42857.143000',
      vatAmount: '2142.857000',
      totalAmount: '45000.000000',
      paidAmount: '0.000000',
      outstandingAmount: '45000.000000',
      status: 'OVERDUE',
    },
  });

  await prisma.invoice.create({
    data: {
      ...invoiceBase,
      invoiceNumber: 'INV-CLG-2026-0001',
      contractId: coolingContract.id,
      utilityType: 'DISTRICT_COOLING',
      dueDate,
      subtotal: '21238.095000',
      vatAmount: '1061.905000',
      totalAmount: '22300.000000',
      paidAmount: '22300.000000',
      outstandingAmount: '0.000000',
      status: 'PAID',
    },
  });

  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: gasInvoice.id, description: 'Gas Consumption (Jan 2026) — 8,640 MMBTU', quantity: '8640.000000', unit: 'MMBTU', rate: '12.500000', amount: '108000.000000', lineType: 'consumption' },
      { invoiceId: gasInvoice.id, description: 'Service Charge — 8,640 MMBTU', quantity: '8640.000000', unit: 'MMBTU', rate: '1.250000', amount: '4500.000000', lineType: 'service' },
      { invoiceId: powerInvoice.id, description: 'Peak Power Consumption — 92,400 kWh', quantity: '92400.000000', unit: 'KWH', rate: '0.520000', amount: '48048.000000', lineType: 'consumption' },
      { invoiceId: powerInvoice.id, description: 'Off-Peak Power Consumption — 134,000 kWh', quantity: '134000.000000', unit: 'KWH', rate: '0.350000', amount: '46900.000000', lineType: 'consumption' },
    ],
  });

  await prisma.payment.create({
    data: {
      invoiceId: gasInvoice.id,
      paymentRef: 'PAY-2026-001',
      amount: '118125.000000',
      currency: 'AED',
      paidAt: new Date('2026-02-10'),
      method: 'bank_transfer',
      status: 'COMPLETED',
      gatewayRef: 'BANK-TXN-12345',
    },
  });

  console.log('  ✓ Created billing run + 4 invoices + line items + 1 payment');

  // ─── Notifications ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: cu2!.id,
        type: 'BILLING_ALERT',
        channel: 'IN_APP',
        title: 'Invoice INV-GAS-2026-0001 Paid',
        body: 'Your payment of AED 118,125 for invoice INV-GAS-2026-0001 has been received. Thank you.',
        isRead: true,
        sentAt: new Date('2026-02-10'),
      },
      {
        userId: cu3!.id,
        type: 'PAYMENT_DUE',
        channel: 'IN_APP',
        title: 'Payment Overdue — INV-WTR-2026-0001',
        body: 'Invoice INV-WTR-2026-0001 for AED 45,000 is overdue. Please make payment to avoid service disruption.',
        isRead: false,
        sentAt: new Date('2026-02-16'),
      },
      {
        userId: cu1!.id,
        type: 'BILLING_ALERT',
        channel: 'IN_APP',
        title: 'Invoice INV-PWR-2026-0001 Ready',
        body: 'Your January 2026 Power invoice (AED 99,999.90) is ready. Due date: 1 March 2026.',
        isRead: false,
        sentAt: new Date('2026-02-01'),
      },
    ],
  });

  console.log('  ✓ Created notifications (3)');

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: 'CREATE', entityType: 'Customer', entityId: cust1!.id, newValues: { customerCode: cust1!.customerCode } },
      { userId: admin.id, action: 'CREATE', entityType: 'Contract', entityId: gasContract.id, newValues: { contractNumber: gasContract.contractNumber } },
      { userId: admin.id, action: 'CREATE', entityType: 'BillingRun', entityId: billingRun.id, newValues: { runCode: billingRun.runCode } },
    ],
  });

  console.log('  ✓ Created audit log entries');

  // ─── Tariff Rates ─────────────────────────────────────────────────────────
  const allTariffs = await prisma.tariff.findMany({ orderBy: { utilityType: 'asc' } });
  for (const t of allTariffs) {
    if (t.utilityType === 'GAS') {
      await prisma.tariffRate.createMany({
        data: [
          { tariffId: t.id, rateKey: 'base', rate: '12.500000', unit: 'MMBTU', notes: 'Base consumption charge' },
          { tariffId: t.id, rateKey: 'service', rate: '1.250000', unit: 'MMBTU', notes: 'Service charge' },
          { tariffId: t.id, rateKey: 'overtake', rate: '15.000000', unit: 'MMBTU', notes: 'Overtake surcharge' },
        ],
      });
    } else if (t.utilityType === 'POWER') {
      await prisma.tariffRate.createMany({
        data: [
          { tariffId: t.id, rateKey: 'peak', rate: '0.520000', unit: 'kWh', notes: '08:00–20:00 peak rate' },
          { tariffId: t.id, rateKey: 'offpeak', rate: '0.350000', unit: 'kWh', notes: '20:00–08:00 off-peak rate' },
          { tariffId: t.id, rateKey: 'demand', rate: '18.000000', unit: 'kW', notes: 'Monthly demand charge' },
        ],
      });
    } else if (t.utilityType === 'WATER') {
      await prisma.tariffRate.createMany({
        data: [
          { tariffId: t.id, rateKey: 'tier1', rate: '3.200000', unit: 'm3', notes: '0–2,000 m³/month' },
          { tariffId: t.id, rateKey: 'tier2', rate: '4.800000', unit: 'm3', notes: '2,001–5,000 m³/month' },
          { tariffId: t.id, rateKey: 'tier3', rate: '6.500000', unit: 'm3', notes: '>5,000 m³/month' },
        ],
      });
    } else if (t.utilityType === 'DISTRICT_COOLING') {
      await prisma.tariffRate.createMany({
        data: [
          { tariffId: t.id, rateKey: 'capacity', rate: '85.000000', unit: 'RT', notes: 'Monthly capacity charge per RT' },
          { tariffId: t.id, rateKey: 'consumption', rate: '0.950000', unit: 'RTh', notes: 'Consumption charge per RT·hour' },
        ],
      });
    }
  }
  console.log('  ✓ Created tariff rates for all 4 tariffs');

  // ─── Workflow Definitions + Steps ─────────────────────────────────────────
  const wfDefs = [
    {
      workflowType: 'CONTRACT_APPROVAL' as const,
      name: 'Contract Approval',
      description: 'Two-level approval for new contracts and major amendments',
      maxLevels: 2,
      config: { levels: 2, roles: ['MANAGER', 'ADMIN'] },
      steps: [
        { stepNumber: 1, stepName: 'Manager Review', requiredRole: 'MANAGER' as const, isFinalStep: false, timeoutHours: 48 },
        { stepNumber: 2, stepName: 'Admin Approval', requiredRole: 'ADMIN' as const, isFinalStep: true, timeoutHours: 24 },
      ],
    },
    {
      workflowType: 'CONSUMPTION_PROFILE_UPDATE' as const,
      name: 'Consumption Profile Update',
      description: 'Single manager approval for consumption profile amendments',
      maxLevels: 1,
      config: { levels: 1, roles: ['MANAGER'] },
      steps: [
        { stepNumber: 1, stepName: 'Manager Approval', requiredRole: 'MANAGER' as const, isFinalStep: true, timeoutHours: 48 },
      ],
    },
    {
      workflowType: 'BILLING_DISPUTE' as const,
      name: 'Billing Dispute Resolution',
      description: 'Two-level review for customer billing disputes',
      maxLevels: 2,
      config: { levels: 2, roles: ['OPERATOR', 'MANAGER'] },
      steps: [
        { stepNumber: 1, stepName: 'Operator Investigation', requiredRole: 'OPERATOR' as const, isFinalStep: false, timeoutHours: 72 },
        { stepNumber: 2, stepName: 'Manager Decision', requiredRole: 'MANAGER' as const, isFinalStep: true, timeoutHours: 24 },
      ],
    },
    {
      workflowType: 'SERVICE_ACTIVATION' as const,
      name: 'Service Activation',
      description: 'Operator approval for new service activations',
      maxLevels: 1,
      config: { levels: 1, roles: ['OPERATOR'] },
      steps: [
        { stepNumber: 1, stepName: 'Operator Activation', requiredRole: 'OPERATOR' as const, isFinalStep: true, timeoutHours: 24 },
      ],
    },
    {
      workflowType: 'SERVICE_DEACTIVATION' as const,
      name: 'Service Deactivation',
      description: 'Two-level approval for service deactivations',
      maxLevels: 2,
      config: { levels: 2, roles: ['OPERATOR', 'MANAGER'] },
      steps: [
        { stepNumber: 1, stepName: 'Operator Review', requiredRole: 'OPERATOR' as const, isFinalStep: false, timeoutHours: 24 },
        { stepNumber: 2, stepName: 'Manager Approval', requiredRole: 'MANAGER' as const, isFinalStep: true, timeoutHours: 24 },
      ],
    },
    {
      workflowType: 'TARIFF_CHANGE_APPROVAL' as const,
      name: 'Tariff Change Approval',
      description: 'Two-level approval for tariff updates to ensure regulatory compliance',
      maxLevels: 2,
      config: { levels: 2, roles: ['MANAGER', 'ADMIN'] },
      steps: [
        { stepNumber: 1, stepName: 'Manager Review', requiredRole: 'MANAGER' as const, isFinalStep: false, timeoutHours: 48 },
        { stepNumber: 2, stepName: 'Admin Approval', requiredRole: 'ADMIN' as const, isFinalStep: true, timeoutHours: 24 },
      ],
    },
    {
      workflowType: 'INVOICE_APPROVAL' as const,
      name: 'Invoice Approval',
      description: 'Manager approval before high-value invoices are dispatched',
      maxLevels: 1,
      config: { levels: 1, roles: ['MANAGER'] },
      steps: [
        { stepNumber: 1, stepName: 'Manager Approval', requiredRole: 'MANAGER' as const, isFinalStep: true, timeoutHours: 24 },
      ],
    },
  ];

  const createdDefs: Record<string, string> = {};
  for (const wf of wfDefs) {
    const def = await prisma.workflowDefinition.create({
      data: {
        workflowType: wf.workflowType,
        name: wf.name,
        description: wf.description,
        maxLevels: wf.maxLevels,
        config: wf.config,
        steps: { createMany: { data: wf.steps } },
      },
    });
    createdDefs[wf.workflowType] = def.id;
  }
  console.log('  ✓ Created 7 workflow definitions with steps');

  // ─── Nominated Quantities (Gas contract Jan–Mar 2026) ─────────────────────
  const gasDetail = await prisma.gasContractDetail.findUnique({ where: { contractId: gasContract.id } });
  if (gasDetail) {
    await prisma.nominatedQuantity.createMany({
      data: [
        { gasDetailId: gasDetail.id, periodYear: 2026, periodMonth: 1, nominatedQty: '50000.000000', originalDcq: '50000.000000', changeReason: 'Standard monthly nomination', submittedBy: cu2!.id, submittedAt: new Date('2025-11-21') },
        { gasDetailId: gasDetail.id, periodYear: 2026, periodMonth: 2, nominatedQty: '48000.000000', originalDcq: '50000.000000', changeReason: 'Planned maintenance period — reducing by 4%', submittedBy: cu2!.id, submittedAt: new Date('2025-12-20') },
        { gasDetailId: gasDetail.id, periodYear: 2026, periodMonth: 3, nominatedQty: '52000.000000', originalDcq: '50000.000000', changeReason: 'Increased production schedule — requesting 4% uplift', submittedBy: cu2!.id, submittedAt: new Date('2026-01-22') },
      ],
      skipDuplicates: true,
    });
    console.log('  ✓ Created 3 nominated quantities for gas contract');
  }

  // ─── Contract Amendment ────────────────────────────────────────────────────
  await prisma.contractAmendment.create({
    data: {
      contractId: gasContract.id,
      amendmentType: 'QUANTITY_CHANGE',
      requestedBy: cu2!.id,
      effectiveDate: new Date('2026-04-01'),
      changes: { dcq: { from: '50000', to: '55000' }, acq: { from: '18000000', to: '19800000' } },
      reason: 'Expansion of Zone C facility requires additional gas capacity of 10%',
      status: 'DRAFT',
    },
  });
  console.log('  ✓ Created 1 contract amendment (pending)');

  // ─── Billing Adjustments (on power invoice) ───────────────────────────────
  await prisma.billingAdjustment.create({
    data: {
      invoiceId: powerInvoice.id,
      adjustedBy: admin.id,
      description: 'Meter calibration correction — Jan 2026 peak hours overcalculated',
      amount: '-3500.000000',
      reason: 'METER_CORRECTION',
      approvedBy: superAdmin.id,
      approvedAt: new Date('2026-02-05'),
    },
  });
  console.log('  ✓ Created billing adjustment on power invoice');

  // ─── Disputed Invoice + Credit Note ───────────────────────────────────────
  const disputedInvoice = await prisma.invoice.create({
    data: {
      ...invoiceBase,
      invoiceNumber: 'INV-GAS-2026-0002',
      contractId: gasContract.id,
      utilityType: 'GAS',
      dueDate: new Date('2026-03-01'),
      subtotal: '14761.905000',
      vatAmount: '738.095000',
      totalAmount: '15500.000000',
      paidAmount: '0.000000',
      outstandingAmount: '15500.000000',
      status: 'DISPUTED',
      billingRunId: billingRun.id,
    },
  });

  await prisma.billingDispute.create({
    data: {
      disputeNumber: 'DISP-2026-0001',
      invoiceId: disputedInvoice.id,
      raisedBy: cu2!.id,
      reason: 'Overtake surcharge incorrect',
      description: 'Invoice includes overtake surcharge for Jan 10 which was within agreed flex window per contract clause 8.3. Customer requests removal of surcharge AED 2,500.',
      disputedAmount: '15500.000000',
      status: 'UNDER_REVIEW',
    },
  });

  const creditNote = await prisma.creditNote.create({
    data: {
      creditNoteNo: 'CN-000001',
      invoiceId: disputedInvoice.id,
      amount: '2500.000000',
      reason: 'Partial credit — overtake surcharge waiver for Jan 10 per commercial review',
      issuedBy: admin.id,
      issuedAt: new Date('2026-02-20'),
    },
  });
  console.log('  ✓ Created disputed invoice + billing dispute + credit note');

  // ─── Service Requests ─────────────────────────────────────────────────────
  await prisma.serviceRequest.createMany({
    data: [
      {
        requestNumber: 'SR-2026-0001',
        customerId: cust1!.id,
        requestType: 'TECHNICAL_ISSUE',
        status: 'OPEN',
        subject: 'Power meter MTR-PWR-0001 showing intermittent readings',
        description: 'Since Jan 28, the smart meter at Zone A Substation has been showing 2–3 hour gaps in hourly readings. Suspect communication issue. Please investigate and validate affected data.',
        slaDeadline: new Date('2026-03-06'),
      },
      {
        requestNumber: 'SR-2026-0002',
        customerId: cust2!.id,
        requestType: 'METER_VERIFICATION',
        status: 'IN_PROGRESS',
        subject: 'Request for gas meter calibration certificate — MTR-GAS-0001',
        description: 'Regulatory audit requires updated calibration certificate for all primary gas meters. Please provide the latest calibration report for MTR-GAS-0001 (Gas-SN-001).',
        assignedTo: admin.id,
        slaDeadline: new Date('2026-03-10'),
      },
      {
        requestNumber: 'SR-2026-0003',
        customerId: cust3!.id,
        requestType: 'ACTIVATION',
        status: 'OPEN',
        subject: 'Request for additional sub-meter installation — Building 7B',
        description: 'Following plant expansion, we require a sub-meter for the new Building 7B water connection. Please advise on installation timeline and required approvals.',
        slaDeadline: new Date('2026-03-15'),
      },
      {
        requestNumber: 'SR-2026-0004',
        customerId: cust1!.id,
        requestType: 'OTHER',
        status: 'RESOLVED',
        subject: 'Update billing contact email address',
        description: 'Please update the billing contact email from billing@globalsteel.ae to accounts@globalsteel.ae effective immediately.',
        resolvedAt: new Date('2026-02-18'),
        resolutionNote: 'Billing contact email updated in CRM and billing system.',
        slaDeadline: new Date('2026-02-20'),
      },
    ],
  });
  console.log('  ✓ Created 4 service requests');

  // ─── Workflow Instances (demo inbox) ──────────────────────────────────────
  const disputeDefId = createdDefs['BILLING_DISPUTE']!;
  const contractDefId = createdDefs['CONTRACT_APPROVAL']!;
  const tariffDefId = createdDefs['TARIFF_CHANGE_APPROVAL']!;

  const wfDispute = await prisma.workflowInstance.create({
    data: {
      workflowType: 'BILLING_DISPUTE',
      workflowDefinitionId: disputeDefId,
      contractId: gasContract.id,
      entityType: 'INVOICE',
      entityId: disputedInvoice.id,
      currentStep: 1,
      status: 'IN_PROGRESS',
      submittedBy: cu2!.id,
      submittedAt: new Date('2026-02-21'),
      notes: 'Overtake surcharge dispute for Jan 10 — within flex window per clause 8.3',
      metadata: { invoiceNumber: 'INV-GAS-2026-0002', disputedAmount: '15500.00' },
    },
  });
  await prisma.workflowAction.create({
    data: {
      workflowInstanceId: wfDispute.id,
      stepNumber: 0,
      actionType: 'SUBMIT',
      actedBy: cu2!.id,
      comments: 'Submitting billing dispute for Jan 2026 gas invoice',
      previousStatus: 'PENDING',
      newStatus: 'IN_PROGRESS',
    },
  });

  const wfContract = await prisma.workflowInstance.create({
    data: {
      workflowType: 'CONTRACT_APPROVAL',
      workflowDefinitionId: contractDefId,
      contractId: gasContract.id,
      entityType: 'CONTRACT',
      entityId: gasContract.id,
      currentStep: 2,
      status: 'IN_PROGRESS',
      submittedBy: admin.id,
      submittedAt: new Date('2026-02-15'),
      notes: 'Amendment approval — DCQ increase from 50,000 to 55,000 MMBTU/day',
      metadata: { amendmentType: 'QUANTITY_CHANGE', summary: 'DCQ uplift 10% for Zone C expansion' },
    },
  });
  await prisma.workflowAction.createMany({
    data: [
      { workflowInstanceId: wfContract.id, stepNumber: 0, actionType: 'SUBMIT', actedBy: admin.id, comments: 'Submitting for manager review', previousStatus: 'PENDING', newStatus: 'IN_PROGRESS' },
      { workflowInstanceId: wfContract.id, stepNumber: 1, actionType: 'APPROVE', actedBy: admin.id, comments: 'Commercial terms verified, customer justified expansion', previousStatus: 'IN_PROGRESS', newStatus: 'IN_PROGRESS', actedAt: new Date('2026-02-16') },
    ],
  });

  const wfTariff = await prisma.workflowInstance.create({
    data: {
      workflowType: 'TARIFF_CHANGE_APPROVAL',
      workflowDefinitionId: tariffDefId,
      entityType: 'TARIFF',
      entityId: allTariffs.find((t) => t.utilityType === 'GAS')?.id ?? 'gas-tariff',
      currentStep: 1,
      status: 'APPROVED',
      submittedBy: admin.id,
      submittedAt: new Date('2025-12-01'),
      completedAt: new Date('2025-12-05'),
      notes: 'Annual gas tariff increase — 3% escalation per contractual CPI clause',
      metadata: { utilityType: 'GAS', previousRate: '12.135922', newRate: '12.500000' },
    },
  });
  await prisma.workflowAction.createMany({
    data: [
      { workflowInstanceId: wfTariff.id, stepNumber: 0, actionType: 'SUBMIT', actedBy: admin.id, previousStatus: 'PENDING', newStatus: 'IN_PROGRESS', actedAt: new Date('2025-12-01') },
      { workflowInstanceId: wfTariff.id, stepNumber: 1, actionType: 'APPROVE', actedBy: admin.id, comments: 'Rate increase is within annual CPI cap', previousStatus: 'IN_PROGRESS', newStatus: 'IN_PROGRESS', actedAt: new Date('2025-12-02') },
      { workflowInstanceId: wfTariff.id, stepNumber: 2, actionType: 'APPROVE', actedBy: superAdmin.id, comments: 'Approved for 2025 rate year', previousStatus: 'IN_PROGRESS', newStatus: 'APPROVED', actedAt: new Date('2025-12-05') },
    ],
  });
  console.log('  ✓ Created 3 workflow instances (dispute, contract amendment, tariff change)');

  // ─── Additional Notifications ──────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: cu1!.id,
        type: 'CONSUMPTION_ANOMALY',
        channel: 'IN_APP',
        title: 'High Consumption Alert — POWER',
        body: 'Unusual power consumption detected on meter MTR-PWR-0001 (68% above your 30-day average) on Feb 18. Please review or contact support.',
        isRead: false,
        sentAt: new Date('2026-02-18'),
      },
      {
        userId: cu2!.id,
        type: 'WORKFLOW_ACTION_REQUIRED',
        channel: 'IN_APP',
        title: 'Billing Dispute Under Review',
        body: 'Your billing dispute for invoice INV-GAS-2026-0002 (AED 15,500) is under review. We will notify you when a decision is made.',
        isRead: false,
        sentAt: new Date('2026-02-21'),
      },
      {
        userId: cu3!.id,
        type: 'SYSTEM_ALERT',
        channel: 'IN_APP',
        title: 'Nominated Quantity Deadline Reminder',
        body: 'A reminder that the gas nominated quantity for April 2026 must be submitted by 21 March 2026 (140 days notice required).',
        isRead: false,
        sentAt: new Date('2026-03-01'),
      },
      {
        userId: cu1!.id,
        type: 'CONTRACT_EXPIRY',
        channel: 'IN_APP',
        title: 'Contract Renewal Notice — KUFM-CLG-2025-001',
        body: 'Your District Cooling contract expires on 31 December 2027. Please contact your account manager to begin renewal discussions.',
        isRead: true,
        sentAt: new Date('2026-01-01'),
      },
    ],
  });
  console.log('  ✓ Created 4 additional notifications');

  console.log('\n🎉 Seed complete!\n');
  console.log('Login credentials (password: Password123!):');
  console.log('  Super Admin : superadmin@kezad.ae');
  console.log('  Admin       : admin@kezad.ae');
  console.log('  Manager     : manager@kezad.ae');
  console.log('  Operator    : operator@kezad.ae');
  console.log('  Customer 1  : procurement@globalsteel.ae');
  console.log('  Customer 2  : utilities@petrochemicalabu.ae');
  console.log('  Customer 3  : facilities@AlHamraMfg.ae');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => void prisma.$disconnect());
