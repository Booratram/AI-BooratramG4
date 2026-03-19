import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Login } from './apps/Login';
import { Analytics } from './apps/admin/Analytics';
import { Onboarding } from './apps/admin/Onboarding';
import { TenantDetail } from './apps/admin/TenantDetail';
import { Tenants } from './apps/admin/Tenants';
import { Brain } from './apps/client/Brain';
import { Calendar } from './apps/client/Calendar';
import { Cases } from './apps/client/Cases';
import { Dashboard } from './apps/client/Dashboard';
import { Knowledge } from './apps/client/Knowledge';
import { Projects } from './apps/client/Projects';
import { AuthProvider } from './auth/auth-context';
import { RequireAuth } from './auth/require-auth';
import { AppShell, type NavItem } from './components/app-shell';

const clientNav: NavItem[] = [
  { label: 'Сводка', to: '/client/dashboard' },
  { label: 'Мозг', to: '/client/brain' },
  { label: 'Календарь', to: '/client/calendar' },
  { label: 'Проекты', to: '/client/projects' },
  { label: 'Кейсы', to: '/client/cases' },
  { label: 'Знания', to: '/client/knowledge' },
];

const adminNav: NavItem[] = [
  { label: 'Тенанты', to: '/admin/tenants' },
  { label: 'Аналитика', to: '/admin/analytics' },
  { label: 'Онбординг', to: '/admin/onboarding' },
];

function ClientLayout() {
  return (
    <AppShell
      brand="BooratramG4"
      title="Операционный центр компании"
      subtitle="Русскоязычный AI-контур для проектов, дедлайнов, кейсов и управленческих решений"
      navItems={clientNav}
      accent="coral"
    >
      <Outlet />
    </AppShell>
  );
}

function AdminLayout() {
  return (
    <AppShell
      brand="BG Studio AI"
      title="Администрирование платформы"
      subtitle="Управление тенантами, аналитикой платформы и сценариями онбординга"
      navItems={adminNav}
      accent="moss"
    >
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route path="/client" element={<ClientLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="brain" element={<Brain />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="projects" element={<Projects />} />
              <Route path="cases" element={<Cases />} />
              <Route path="knowledge" element={<Knowledge />} />
            </Route>
          </Route>

          <Route element={<RequireAuth roles={['SUPER_ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="tenants" element={<Tenants />} />
              <Route path="tenants/:tenantId" element={<TenantDetail />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="onboarding" element={<Onboarding />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}