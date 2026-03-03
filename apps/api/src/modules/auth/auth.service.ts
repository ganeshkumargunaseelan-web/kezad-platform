import bcrypt from 'bcrypt';
import { addDays, addMinutes } from 'date-fns';
import type { PrismaClient } from '@kezad/database';
import type {
  LoginInput,
  RegisterInput,
  CustomerRegisterInput,
  VerifyOtpInput,
  AuthResponse,
  RefreshTokenInput,
} from '@kezad/types';
import { UnauthorizedError, ConflictError, ValidationError, BusinessRuleError } from '../../lib/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../plugins/auth.js';
import { env } from '../../config/env.js';
import { AuthRepository } from './auth.repository.js';
import { generateCustomerCode } from '@kezad/utils';

const BCRYPT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthService {
  private readonly repo: AuthRepository;

  constructor(private readonly db: PrismaClient) {
    this.repo = new AuthRepository(db);
  }

  // ─── Employee / Admin Login ──────────────────────────────────────────────

  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.role === 'CUSTOMER') {
      throw new UnauthorizedError('Customers must use the customer portal login');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await this.repo.updateLastLogin(user.id);
    return this.issueTokens(user, ipAddress, userAgent);
  }

  // ─── Employee Registration ────────────────────────────────────────────────

  async register(input: RegisterInput): Promise<{ id: string; email: string }> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.repo.createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role ?? 'OPERATOR',
      phone: input.phone,
      department: input.department,
    });

    return { id: user.id, email: user.email };
  }

  // ─── Customer OTP Registration ────────────────────────────────────────────

  async initiateCustomerRegistration(input: CustomerRegisterInput): Promise<{ message: string }> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const otp = generateOtp();
    const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES);

    await this.repo.createOtp({
      email: input.email,
      code: otp,
      purpose: 'registration',
      expiresAt,
    });

    // In production this would send via notification adapter
    // For now: log to console (mock)
    console.info(`[MOCK OTP] Registration OTP for ${input.email}: ${otp} (expires: ${expiresAt.toISOString()})`);

    return { message: 'OTP sent to your email address. Valid for 10 minutes.' };
  }

  async verifyOtpAndCreateCustomer(
    input: VerifyOtpInput,
    registrationData: CustomerRegisterInput,
  ): Promise<AuthResponse> {
    const otp = await this.repo.findValidOtp(input.email, input.code, 'registration');
    if (!otp) {
      throw new ValidationError('Invalid or expired OTP');
    }

    if (!input.password) {
      throw new ValidationError('Password is required to complete registration');
    }

    await this.repo.markOtpUsed(otp.id);

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create user + customer in transaction
    const { user } = await this.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: registrationData.email,
          passwordHash,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          role: 'CUSTOMER',
          phone: registrationData.phone,
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          customerCode: generateCustomerCode(),
          companyName: registrationData.companyName,
          contacts: {
            create: {
              name: `${registrationData.firstName} ${registrationData.lastName}`,
              email: registrationData.email,
              phone: registrationData.phone,
              isPrimary: true,
            },
          },
        },
      });

      return { user, customer };
    });

    return this.issueTokens(user);
  }

  // ─── Customer Portal Login (with OTP option) ──────────────────────────────

  async customerLogin(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user || !user.isActive || user.role !== 'CUSTOMER') {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await this.repo.updateLastLogin(user.id);
    return this.issueTokens(user, ipAddress, userAgent);
  }

  // ─── Token Refresh ────────────────────────────────────────────────────────

  async refreshTokens(input: RefreshTokenInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const storedToken = await this.repo.findRefreshToken(input.refreshToken);
    if (!storedToken) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    const user = await this.repo.findUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or disabled');
    }

    // Revoke old token (rotation)
    await this.repo.revokeRefreshToken(input.refreshToken);

    return this.issueTokens(user, ipAddress, userAgent);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    await this.repo.revokeRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repo.revokeAllUserRefreshTokens(userId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async issueTokens(
    user: { id: string; email: string; role: string; firstName?: string; lastName?: string },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // Look up customerId if customer role
    let customerId: string | null = null;
    if (user.role === 'CUSTOMER') {
      const customer = await this.db.customer.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      customerId = customer?.id ?? null;
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as never,
      customerId,
    });

    const refreshToken = signRefreshToken(user.id);
    const expiresAt = addDays(new Date(), REFRESH_TOKEN_EXPIRY_DAYS);

    await this.repo.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        role: user.role as never,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        customerId,
      },
    };
  }
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
