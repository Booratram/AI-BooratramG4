import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { RequestWithContext } from '../common/http/request-context';
import { SKIP_TENANT_KEY } from './decorators/skip-tenant.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const skipTenant = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || skipTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const explicitTenant = request.headers['x-tenant-id'];
    const tenantId =
      typeof explicitTenant === 'string' && explicitTenant.trim().length > 0
        ? explicitTenant
        : request.user?.tenantId;

    if (!request.user || !tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    if (
      request.user.role !== UserRole.SUPER_ADMIN &&
      tenantId !== request.user.tenantId
    ) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    request.tenantId = tenantId;
    return true;
  }
}
