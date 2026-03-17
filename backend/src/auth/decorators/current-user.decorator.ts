import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithContext } from '../../common/http/request-context';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    return request.user;
  },
);
