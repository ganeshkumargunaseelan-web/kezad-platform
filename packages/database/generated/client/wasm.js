
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  role: 'role',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  department: 'department',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent'
};

exports.Prisma.OtpCodeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  email: 'email',
  phone: 'phone',
  code: 'code',
  purpose: 'purpose',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  attempts: 'attempts',
  createdAt: 'createdAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  customerCode: 'customerCode',
  companyName: 'companyName',
  tradeLicenseNo: 'tradeLicenseNo',
  vatRegistrationNo: 'vatRegistrationNo',
  industry: 'industry',
  address: 'address',
  crmExternalId: 'crmExternalId',
  crmSyncStatus: 'crmSyncStatus',
  crmSyncedAt: 'crmSyncedAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CustomerContactScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  name: 'name',
  role: 'role',
  email: 'email',
  phone: 'phone',
  isPrimary: 'isPrimary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerDocumentScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  documentType: 'documentType',
  fileName: 'fileName',
  fileUrl: 'fileUrl',
  expiresAt: 'expiresAt',
  uploadedAt: 'uploadedAt'
};

exports.Prisma.ContractScalarFieldEnum = {
  id: 'id',
  contractNumber: 'contractNumber',
  customerId: 'customerId',
  utilityType: 'utilityType',
  status: 'status',
  version: 'version',
  startDate: 'startDate',
  endDate: 'endDate',
  siteAddress: 'siteAddress',
  siteCoordinates: 'siteCoordinates',
  notes: 'notes',
  regulatoryRef: 'regulatoryRef',
  regulatoryStatus: 'regulatoryStatus',
  erpCustomerId: 'erpCustomerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContractVersionScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  version: 'version',
  snapshotData: 'snapshotData',
  changedFields: 'changedFields',
  changedBy: 'changedBy',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.ContractAmendmentScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  amendmentType: 'amendmentType',
  requestedBy: 'requestedBy',
  requestedAt: 'requestedAt',
  effectiveDate: 'effectiveDate',
  noticeDateSent: 'noticeDateSent',
  changes: 'changes',
  reason: 'reason',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt'
};

exports.Prisma.GasContractDetailScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  dcq: 'dcq',
  acq: 'acq',
  topThresholdPct: 'topThresholdPct',
  overtakeThresholdPct: 'overtakeThresholdPct',
  basePrice: 'basePrice',
  serviceCharge: 'serviceCharge',
  overtakeSurcharge: 'overtakeSurcharge',
  currency: 'currency',
  monthlyFlexPct: 'monthlyFlexPct',
  monthlyCapPct: 'monthlyCapPct',
  noticeRequiredDays: 'noticeRequiredDays',
  washUpEnabled: 'washUpEnabled',
  washDownEnabled: 'washDownEnabled',
  contractYear: 'contractYear',
  maxReductionPctYear1_2: 'maxReductionPctYear1_2',
  maxReductionPctAfter: 'maxReductionPctAfter',
  priceEscalationPct: 'priceEscalationPct',
  escalationFrequency: 'escalationFrequency'
};

exports.Prisma.NominatedQuantityScalarFieldEnum = {
  id: 'id',
  gasDetailId: 'gasDetailId',
  periodYear: 'periodYear',
  periodMonth: 'periodMonth',
  nominatedQty: 'nominatedQty',
  originalDcq: 'originalDcq',
  changeReason: 'changeReason',
  submittedAt: 'submittedAt',
  submittedBy: 'submittedBy',
  noticeDateSent: 'noticeDateSent',
  approvedAt: 'approvedAt',
  approvedBy: 'approvedBy'
};

exports.Prisma.TopShortfallScalarFieldEnum = {
  id: 'id',
  gasDetailId: 'gasDetailId',
  periodYear: 'periodYear',
  actualQty: 'actualQty',
  acqQty: 'acqQty',
  shortfallQty: 'shortfallQty',
  shortfallAmt: 'shortfallAmt',
  paidAt: 'paidAt',
  invoiceId: 'invoiceId',
  createdAt: 'createdAt'
};

exports.Prisma.OvertakeRecordScalarFieldEnum = {
  id: 'id',
  gasDetailId: 'gasDetailId',
  periodDate: 'periodDate',
  dcqQty: 'dcqQty',
  actualQty: 'actualQty',
  overtakeQty: 'overtakeQty',
  surchargeAmt: 'surchargeAmt',
  invoiceId: 'invoiceId',
  createdAt: 'createdAt'
};

exports.Prisma.YearEndReconciliationScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  periodYear: 'periodYear',
  acqQty: 'acqQty',
  actualQty: 'actualQty',
  topThresholdQty: 'topThresholdQty',
  shortfallQty: 'shortfallQty',
  washUpAmt: 'washUpAmt',
  washDownAmt: 'washDownAmt',
  netPayableAmt: 'netPayableAmt',
  status: 'status',
  invoiceId: 'invoiceId',
  calculatedAt: 'calculatedAt',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt'
};

exports.Prisma.PowerContractDetailScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  contractedKw: 'contractedKw',
  currency: 'currency',
  touEnabled: 'touEnabled',
  peakHoursStart: 'peakHoursStart',
  peakHoursEnd: 'peakHoursEnd'
};

exports.Prisma.WaterContractDetailScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  contractedM3: 'contractedM3',
  currency: 'currency',
  tieredRates: 'tieredRates'
};

exports.Prisma.CoolingContractDetailScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  contractedRt: 'contractedRt',
  contractedTonHours: 'contractedTonHours',
  capacityChargePerRt: 'capacityChargePerRt',
  consumptionChargePerTh: 'consumptionChargePerTh',
  currency: 'currency'
};

exports.Prisma.ConsumptionProfileScalarFieldEnum = {
  id: 'id',
  contractId: 'contractId',
  periodYear: 'periodYear',
  version: 'version',
  monthlyForecasts: 'monthlyForecasts',
  submittedBy: 'submittedBy',
  submittedAt: 'submittedAt',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  status: 'status',
  notes: 'notes'
};

exports.Prisma.MeterScalarFieldEnum = {
  id: 'id',
  meterCode: 'meterCode',
  contractId: 'contractId',
  meterType: 'meterType',
  serialNumber: 'serialNumber',
  manufacturer: 'manufacturer',
  model: 'model',
  installDate: 'installDate',
  location: 'location',
  isSubMeter: 'isSubMeter',
  parentMeterId: 'parentMeterId',
  scadaNodeId: 'scadaNodeId',
  modbusRegister: 'modbusRegister',
  dataSource: 'dataSource',
  pollingInterval: 'pollingInterval',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MeterDataPointScalarFieldEnum = {
  id: 'id',
  meterId: 'meterId',
  periodStartUtc: 'periodStartUtc',
  periodEndUtc: 'periodEndUtc',
  rawValue: 'rawValue',
  unit: 'unit',
  qualityFlag: 'qualityFlag',
  isInterpolated: 'isInterpolated',
  isManual: 'isManual',
  checksum: 'checksum',
  sourceSystem: 'sourceSystem',
  receivedAt: 'receivedAt'
};

exports.Prisma.MeterReadingScalarFieldEnum = {
  id: 'id',
  meterId: 'meterId',
  readingDate: 'readingDate',
  reading: 'reading',
  unit: 'unit',
  readBy: 'readBy',
  notes: 'notes',
  isApproved: 'isApproved',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  createdAt: 'createdAt'
};

exports.Prisma.TariffScalarFieldEnum = {
  id: 'id',
  utilityType: 'utilityType',
  tariffType: 'tariffType',
  name: 'name',
  description: 'description',
  currency: 'currency',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  version: 'version',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.TariffRateScalarFieldEnum = {
  id: 'id',
  tariffId: 'tariffId',
  rateKey: 'rateKey',
  rate: 'rate',
  unit: 'unit',
  notes: 'notes'
};

exports.Prisma.TariffTierScalarFieldEnum = {
  id: 'id',
  tariffId: 'tariffId',
  tierNumber: 'tierNumber',
  fromQty: 'fromQty',
  toQty: 'toQty',
  rate: 'rate',
  unit: 'unit'
};

exports.Prisma.TouPeriodScalarFieldEnum = {
  id: 'id',
  tariffId: 'tariffId',
  periodName: 'periodName',
  startTime: 'startTime',
  endTime: 'endTime',
  daysOfWeek: 'daysOfWeek',
  rate: 'rate',
  unit: 'unit'
};

exports.Prisma.BillingRunScalarFieldEnum = {
  id: 'id',
  runCode: 'runCode',
  periodFrom: 'periodFrom',
  periodTo: 'periodTo',
  utilityTypes: 'utilityTypes',
  status: 'status',
  totalInvoices: 'totalInvoices',
  failedCount: 'failedCount',
  totalAmount: 'totalAmount',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  triggeredBy: 'triggeredBy',
  errorLog: 'errorLog',
  createdAt: 'createdAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  invoiceNumber: 'invoiceNumber',
  contractId: 'contractId',
  billingRunId: 'billingRunId',
  utilityType: 'utilityType',
  status: 'status',
  periodFrom: 'periodFrom',
  periodTo: 'periodTo',
  issueDate: 'issueDate',
  dueDate: 'dueDate',
  subtotal: 'subtotal',
  vatPct: 'vatPct',
  vatAmount: 'vatAmount',
  totalAmount: 'totalAmount',
  paidAmount: 'paidAmount',
  outstandingAmount: 'outstandingAmount',
  currency: 'currency',
  isProrated: 'isProrated',
  isRerating: 'isRerating',
  pdfUrl: 'pdfUrl',
  erpInvoiceId: 'erpInvoiceId',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InvoiceLineItemScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  tariffId: 'tariffId',
  description: 'description',
  lineType: 'lineType',
  quantity: 'quantity',
  unit: 'unit',
  rate: 'rate',
  amount: 'amount',
  periodFrom: 'periodFrom',
  periodTo: 'periodTo',
  metadata: 'metadata'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  paymentRef: 'paymentRef',
  amount: 'amount',
  currency: 'currency',
  method: 'method',
  status: 'status',
  gatewayRef: 'gatewayRef',
  gatewayResponse: 'gatewayResponse',
  paidAt: 'paidAt',
  allocatedAt: 'allocatedAt',
  isUnapplied: 'isUnapplied',
  erpPaymentId: 'erpPaymentId',
  createdAt: 'createdAt'
};

exports.Prisma.BillingAdjustmentScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  adjustedBy: 'adjustedBy',
  adjustedAt: 'adjustedAt',
  description: 'description',
  amount: 'amount',
  reason: 'reason',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt'
};

exports.Prisma.CreditNoteScalarFieldEnum = {
  id: 'id',
  creditNoteNo: 'creditNoteNo',
  invoiceId: 'invoiceId',
  amount: 'amount',
  reason: 'reason',
  issuedBy: 'issuedBy',
  issuedAt: 'issuedAt',
  appliedAt: 'appliedAt'
};

exports.Prisma.WorkflowDefinitionScalarFieldEnum = {
  id: 'id',
  workflowType: 'workflowType',
  name: 'name',
  description: 'description',
  maxLevels: 'maxLevels',
  isActive: 'isActive',
  config: 'config'
};

exports.Prisma.WorkflowStepScalarFieldEnum = {
  id: 'id',
  workflowDefinitionId: 'workflowDefinitionId',
  stepNumber: 'stepNumber',
  stepName: 'stepName',
  requiredRole: 'requiredRole',
  isFinalStep: 'isFinalStep',
  timeoutHours: 'timeoutHours',
  notifyOnAssign: 'notifyOnAssign'
};

exports.Prisma.WorkflowInstanceScalarFieldEnum = {
  id: 'id',
  workflowType: 'workflowType',
  workflowDefinitionId: 'workflowDefinitionId',
  contractId: 'contractId',
  entityType: 'entityType',
  entityId: 'entityId',
  currentStep: 'currentStep',
  status: 'status',
  submittedBy: 'submittedBy',
  submittedAt: 'submittedAt',
  completedAt: 'completedAt',
  notes: 'notes',
  metadata: 'metadata'
};

exports.Prisma.WorkflowActionScalarFieldEnum = {
  id: 'id',
  workflowInstanceId: 'workflowInstanceId',
  stepNumber: 'stepNumber',
  actionType: 'actionType',
  actedBy: 'actedBy',
  actedAt: 'actedAt',
  comments: 'comments',
  previousStatus: 'previousStatus',
  newStatus: 'newStatus'
};

exports.Prisma.ServiceRequestScalarFieldEnum = {
  id: 'id',
  requestNumber: 'requestNumber',
  customerId: 'customerId',
  requestType: 'requestType',
  status: 'status',
  subject: 'subject',
  description: 'description',
  attachments: 'attachments',
  assignedTo: 'assignedTo',
  resolvedAt: 'resolvedAt',
  resolutionNote: 'resolutionNote',
  slaDeadline: 'slaDeadline',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BillingDisputeScalarFieldEnum = {
  id: 'id',
  disputeNumber: 'disputeNumber',
  invoiceId: 'invoiceId',
  raisedBy: 'raisedBy',
  raisedAt: 'raisedAt',
  reason: 'reason',
  description: 'description',
  disputedAmount: 'disputedAmount',
  status: 'status',
  resolvedBy: 'resolvedBy',
  resolvedAt: 'resolvedAt',
  resolution: 'resolution',
  creditNoteId: 'creditNoteId'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  channel: 'channel',
  title: 'title',
  body: 'body',
  metadata: 'metadata',
  isRead: 'isRead',
  sentAt: 'sentAt',
  deliveredAt: 'deliveredAt',
  failureReason: 'failureReason',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  description: 'description',
  oldValues: 'oldValues',
  newValues: 'newValues',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.MockScadaDatapointScalarFieldEnum = {
  id: 'id',
  nodeId: 'nodeId',
  systemName: 'systemName',
  value: 'value',
  unit: 'unit',
  quality: 'quality',
  timestamp: 'timestamp',
  createdAt: 'createdAt'
};

exports.Prisma.MockBmsDatapointScalarFieldEnum = {
  id: 'id',
  register: 'register',
  systemName: 'systemName',
  value: 'value',
  unit: 'unit',
  timestamp: 'timestamp',
  createdAt: 'createdAt'
};

exports.Prisma.ReportSnapshotScalarFieldEnum = {
  id: 'id',
  reportType: 'reportType',
  parameters: 'parameters',
  generatedBy: 'generatedBy',
  generatedAt: 'generatedAt',
  data: 'data',
  exportUrl: 'exportUrl',
  expiresAt: 'expiresAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
  CUSTOMER: 'CUSTOMER'
};

exports.AdapterSyncStatus = exports.$Enums.AdapterSyncStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PARTIAL: 'PARTIAL'
};

exports.UtilityType = exports.$Enums.UtilityType = {
  GAS: 'GAS',
  POWER: 'POWER',
  WATER: 'WATER',
  DISTRICT_COOLING: 'DISTRICT_COOLING'
};

exports.ContractStatus = exports.$Enums.ContractStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
  EXPIRED: 'EXPIRED'
};

exports.ContractAmendmentType = exports.$Enums.ContractAmendmentType = {
  QUANTITY_CHANGE: 'QUANTITY_CHANGE',
  PRICE_CHANGE: 'PRICE_CHANGE',
  TERM_EXTENSION: 'TERM_EXTENSION',
  TERMINATION: 'TERMINATION',
  OTHER: 'OTHER'
};

exports.MeterType = exports.$Enums.MeterType = {
  GAS: 'GAS',
  POWER: 'POWER',
  WATER: 'WATER',
  COOLING: 'COOLING',
  SUB_METER: 'SUB_METER'
};

exports.DataQualityFlag = exports.$Enums.DataQualityFlag = {
  GOOD: 'GOOD',
  BAD: 'BAD',
  SUSPECT: 'SUSPECT',
  ESTIMATED: 'ESTIMATED',
  MANUAL: 'MANUAL'
};

exports.TariffType = exports.$Enums.TariffType = {
  VOLUME_BASED: 'VOLUME_BASED',
  TIME_OF_USE: 'TIME_OF_USE',
  DYNAMIC: 'DYNAMIC',
  MULTI_TIER: 'MULTI_TIER',
  DUAL_STRUCTURE: 'DUAL_STRUCTURE'
};

exports.InvoiceStatus = exports.$Enums.InvoiceStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SENT: 'SENT',
  PAID: 'PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  OVERDUE: 'OVERDUE',
  DISPUTED: 'DISPUTED',
  CANCELLED: 'CANCELLED',
  VOID: 'VOID'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.WorkflowType = exports.$Enums.WorkflowType = {
  CONTRACT_APPROVAL: 'CONTRACT_APPROVAL',
  CONSUMPTION_PROFILE_UPDATE: 'CONSUMPTION_PROFILE_UPDATE',
  BILLING_DISPUTE: 'BILLING_DISPUTE',
  SERVICE_ACTIVATION: 'SERVICE_ACTIVATION',
  SERVICE_DEACTIVATION: 'SERVICE_DEACTIVATION',
  TARIFF_CHANGE_APPROVAL: 'TARIFF_CHANGE_APPROVAL',
  INVOICE_APPROVAL: 'INVOICE_APPROVAL'
};

exports.WorkflowStatus = exports.$Enums.WorkflowStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SENT_BACK: 'SENT_BACK',
  CANCELLED: 'CANCELLED'
};

exports.WorkflowActionType = exports.$Enums.WorkflowActionType = {
  SUBMIT: 'SUBMIT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  SEND_BACK: 'SEND_BACK',
  ESCALATE: 'ESCALATE',
  CANCEL: 'CANCEL'
};

exports.ServiceRequestType = exports.$Enums.ServiceRequestType = {
  ACTIVATION: 'ACTIVATION',
  DEACTIVATION: 'DEACTIVATION',
  TECHNICAL_ISSUE: 'TECHNICAL_ISSUE',
  METER_VERIFICATION: 'METER_VERIFICATION',
  OTHER: 'OTHER'
};

exports.ServiceRequestStatus = exports.$Enums.ServiceRequestStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  BILLING_ALERT: 'BILLING_ALERT',
  PAYMENT_DUE: 'PAYMENT_DUE',
  CONSUMPTION_ANOMALY: 'CONSUMPTION_ANOMALY',
  CONTRACT_EXPIRY: 'CONTRACT_EXPIRY',
  WORKFLOW_ACTION_REQUIRED: 'WORKFLOW_ACTION_REQUIRED',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  OTP: 'OTP'
};

exports.NotificationChannel = exports.$Enums.NotificationChannel = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  IN_APP: 'IN_APP',
  PUSH: 'PUSH'
};

exports.AuditAction = exports.$Enums.AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  EXPORT: 'EXPORT'
};

exports.Prisma.ModelName = {
  User: 'User',
  RefreshToken: 'RefreshToken',
  OtpCode: 'OtpCode',
  Customer: 'Customer',
  CustomerContact: 'CustomerContact',
  CustomerDocument: 'CustomerDocument',
  Contract: 'Contract',
  ContractVersion: 'ContractVersion',
  ContractAmendment: 'ContractAmendment',
  GasContractDetail: 'GasContractDetail',
  NominatedQuantity: 'NominatedQuantity',
  TopShortfall: 'TopShortfall',
  OvertakeRecord: 'OvertakeRecord',
  YearEndReconciliation: 'YearEndReconciliation',
  PowerContractDetail: 'PowerContractDetail',
  WaterContractDetail: 'WaterContractDetail',
  CoolingContractDetail: 'CoolingContractDetail',
  ConsumptionProfile: 'ConsumptionProfile',
  Meter: 'Meter',
  MeterDataPoint: 'MeterDataPoint',
  MeterReading: 'MeterReading',
  Tariff: 'Tariff',
  TariffRate: 'TariffRate',
  TariffTier: 'TariffTier',
  TouPeriod: 'TouPeriod',
  BillingRun: 'BillingRun',
  Invoice: 'Invoice',
  InvoiceLineItem: 'InvoiceLineItem',
  Payment: 'Payment',
  BillingAdjustment: 'BillingAdjustment',
  CreditNote: 'CreditNote',
  WorkflowDefinition: 'WorkflowDefinition',
  WorkflowStep: 'WorkflowStep',
  WorkflowInstance: 'WorkflowInstance',
  WorkflowAction: 'WorkflowAction',
  ServiceRequest: 'ServiceRequest',
  BillingDispute: 'BillingDispute',
  Notification: 'Notification',
  AuditLog: 'AuditLog',
  MockScadaDatapoint: 'MockScadaDatapoint',
  MockBmsDatapoint: 'MockBmsDatapoint',
  ReportSnapshot: 'ReportSnapshot'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
