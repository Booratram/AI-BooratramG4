import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth-context';

interface RequireAuthProps {
  roles?: Array<'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MEMBER'>;
}

export function RequireAuth({ roles }: RequireAuthProps) {
  const { session } = useAuth();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(session.user.role)) {
    return <Navigate to="/client/dashboard" replace />;
  }

  return <Outlet />;
}
