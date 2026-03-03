import type { PrismaClient } from '@kezad/database';
import type { User, RefreshToken, OtpCode } from '@kezad/database';

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.db.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.db.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: User['role'];
    phone?: string;
    department?: string;
  }): Promise<User> {
    return this.db.user.create({ data });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async createRefreshToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<RefreshToken> {
    return this.db.refreshToken.create({ data });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.db.refreshToken.findFirst({
      where: { token, revokedAt: null },
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createOtp(data: {
    email?: string;
    phone?: string;
    userId?: string;
    code: string;
    purpose: string;
    expiresAt: Date;
  }): Promise<OtpCode> {
    return this.db.otpCode.create({ data });
  }

  async findValidOtp(
    email: string,
    code: string,
    purpose: string,
  ): Promise<OtpCode | null> {
    return this.db.otpCode.findFirst({
      where: {
        email,
        code,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 },
      },
    });
  }

  async markOtpUsed(id: string): Promise<void> {
    await this.db.otpCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    await this.db.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }
}
