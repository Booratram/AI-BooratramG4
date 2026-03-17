import * as argon2 from 'argon2';
import { randomBytes, randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface AuthRequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, meta: AuthRequestMeta = {}) {
    const user = await this.findActiveUser(dto);
    const passwordMatches = await argon2.verify(user.password, dto.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user, meta);
  }

  async refresh(dto: RefreshTokenDto, meta: AuthRequestMeta = {}) {
    const { session, user } = await this.validateRefreshToken(dto.refreshToken);

    await this.prisma.refreshToken.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user, meta);
  }

  async logout(refreshToken: string) {
    const sessionId = this.extractSessionId(refreshToken);

    if (!sessionId) {
      return { revoked: false };
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { revoked: true };
  }

  private async issueTokens(
    user: {
      id: string;
      name: string;
      email: string;
      role: import('@prisma/client').UserRole;
      tenantId: string;
      tenant: { slug: string };
    },
    meta: AuthRequestMeta,
  ) {
    const sessionId = randomUUID();
    const refreshSecret = randomBytes(32).toString('hex');
    const refreshToken = `${sessionId}.${refreshSecret}`;
    const refreshTokenHash = await argon2.hash(refreshToken);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      sessionId,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: sessionId,
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: refreshTokenHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: this.resolveRefreshExpiry(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: user.tenant.slug,
      },
    };
  }

  private async validateRefreshToken(refreshToken: string) {
    const sessionId = this.extractSessionId(refreshToken);

    if (!sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh session expired');
    }

    const tokenMatches = await argon2.verify(session.tokenHash, refreshToken);

    if (!tokenMatches || !session.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      session,
      user: session.user,
    };
  }

  private async findActiveUser(dto: LoginDto) {
    if (dto.tenantSlug) {
      const user = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          tenant: { slug: dto.tenantSlug },
        },
        include: {
          tenant: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return user;
    }

    const matches = await this.prisma.user.findMany({
      where: {
        email: dto.email,
        isActive: true,
      },
      include: {
        tenant: true,
      },
      take: 2,
    });

    if (matches.length !== 1) {
      throw new UnauthorizedException('tenantSlug is required for this user');
    }

    return matches[0];
  }

  private extractSessionId(refreshToken: string) {
    const [sessionId] = refreshToken.split('.');
    return sessionId || null;
  }

  private resolveRefreshExpiry() {
    const spec = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
    const match = spec.match(/^(\d+)([smhd])$/);

    if (!match) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 30);
      return fallback;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const date = new Date();
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(date.getTime() + value * multipliers[unit]);
  }
}

