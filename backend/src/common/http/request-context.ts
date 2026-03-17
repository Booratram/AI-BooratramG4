import { UserRole } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}

export interface RequestWithContext extends Request {
  user?: AuthenticatedUser;
  tenantId?: string;
}
