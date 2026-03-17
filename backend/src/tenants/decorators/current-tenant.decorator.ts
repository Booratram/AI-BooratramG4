import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithContext } from '../../common/http/request-context';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    return request.tenantId;
  },
);
