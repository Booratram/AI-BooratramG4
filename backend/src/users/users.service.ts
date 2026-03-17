import * as argon2 from 'argon2';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../common/http/request-context';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        telegramId: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async create(tenantId: string, actor: AuthenticatedUser, dto: CreateUserDto) {
    this.assertRoleChangeAllowed(actor, dto.role);

    return this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        password: await argon2.hash(dto.password),
        telegramId: dto.telegramId,
        role: dto.role ?? UserRole.MEMBER,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        telegramId: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(tenantId: string, actor: AuthenticatedUser, userId: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    this.assertRoleChangeAllowed(actor, dto.role);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email,
        telegramId: dto.telegramId,
        role: dto.role,
        isActive: dto.isActive,
        password: dto.password ? await argon2.hash(dto.password) : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        telegramId: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async remove(tenantId: string, actor: AuthenticatedUser, userId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    this.assertRoleChangeAllowed(actor, existing.role);
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  private assertRoleChangeAllowed(actor: AuthenticatedUser, targetRole?: UserRole) {
    if (actor.role !== UserRole.SUPER_ADMIN && targetRole === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admin can manage super admin users');
    }
  }
}

