import type { PrismaClient, Customer, Prisma } from '@kezad/database';
import type { CreateCustomerInput, UpdateCustomerInput, CustomerFilter } from '@kezad/types';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { generateCustomerCode } from '@kezad/utils';
import { buildPrismaCursor, buildPaginatedResponse } from '@kezad/utils';

export class CustomersService {
  constructor(private readonly db: PrismaClient) {}

  async list(filter: CustomerFilter) {
    const { search, isActive, cursor, limit } = filter;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { customerCode: { contains: search, mode: 'insensitive' } },
              { vatRegistrationNo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const total = await this.db.customer.count({ where });
    const items = await this.db.customer.findMany({
      where,
      include: { contacts: true, _count: { select: { contracts: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...buildPrismaCursor(cursor),
    });

    return buildPaginatedResponse(items, limit, (c) => c.id, total);
  }

  async findById(id: string) {
    const customer = await this.db.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        contacts: true,
        documents: true,
        contracts: {
          where: { deletedAt: null },
          select: { id: true, contractNumber: true, utilityType: true, status: true, startDate: true },
        },
        user: { select: { email: true, lastLoginAt: true } },
      },
    });
    if (!customer) throw new NotFoundError('Customer', id);
    return customer;
  }

  async create(input: CreateCustomerInput, createdByUserId: string) {
    // Check for existing user with this email (contacts)
    const customerCode = generateCustomerCode();

    return this.db.customer.create({
      data: {
        customerCode,
        companyName: input.companyName,
        tradeLicenseNo: input.tradeLicenseNo,
        vatRegistrationNo: input.vatRegistrationNo,
        industry: input.industry,
        address: input.address ?? undefined,
        user: {
          create: {
            email: input.contacts[0]!.email,
            passwordHash: '', // Will be set when customer sets password
            firstName: input.contacts[0]!.name.split(' ')[0] ?? input.contacts[0]!.name,
            lastName: input.contacts[0]!.name.split(' ').slice(1).join(' ') || '-',
            role: 'CUSTOMER',
          },
        },
        contacts: {
          createMany: {
            data: input.contacts.map((c, i) => ({
              name: c.name,
              role: c.role,
              email: c.email,
              phone: c.phone,
              isPrimary: c.isPrimary || i === 0,
            })),
          },
        },
      },
      include: { contacts: true },
    });
  }

  async update(id: string, input: UpdateCustomerInput) {
    const customer = await this.db.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer', id);

    return this.db.customer.update({
      where: { id },
      data: {
        ...(input.companyName ? { companyName: input.companyName } : {}),
        ...(input.tradeLicenseNo ? { tradeLicenseNo: input.tradeLicenseNo } : {}),
        ...(input.vatRegistrationNo ? { vatRegistrationNo: input.vatRegistrationNo } : {}),
        ...(input.industry ? { industry: input.industry } : {}),
        ...(input.address ? { address: input.address } : {}),
      },
      include: { contacts: true },
    });
  }

  async softDelete(id: string) {
    const customer = await this.db.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer', id);

    const activeContracts = await this.db.contract.count({
      where: { customerId: id, status: 'ACTIVE', deletedAt: null },
    });

    if (activeContracts > 0) {
      throw new ConflictError(
        `Cannot deactivate customer with ${activeContracts} active contract(s). Terminate contracts first.`,
      );
    }

    await this.db.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async triggerCrmSync(id: string) {
    const customer = await this.db.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundError('Customer', id);

    // This will be called by the CRM adapter — update sync status
    await this.db.customer.update({
      where: { id },
      data: { crmSyncStatus: 'PENDING', crmSyncedAt: null },
    });

    return { message: 'CRM sync queued', customerId: id };
  }
}
