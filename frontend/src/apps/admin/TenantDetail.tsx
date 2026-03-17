import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { Panel } from '../../components/panel';
import { adminTenants } from '../../store/demo-data';

export function TenantDetail() {
  const { session } = useAuth();
  const { tenantId } = useParams();
  const [tenant, setTenant] = useState(adminTenants.find((item) => item.id === tenantId) ?? adminTenants[0]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session) return;

      try {
        const items = await apiClient.listAdminTenants(session.accessToken);
        const next = items
          .map((item) => ({
            id: item.id,
            name: item.name,
            plan: item.plan,
            status: item.status,
            cases: item._count?.cases ?? 0,
            memories: item._count?.memories ?? 0,
            users: item._count?.users ?? 0,
          }))
          .find((item) => item.id === tenantId);

        if (active && next) {
          setTenant(next);
        }
      } catch {
        if (!active) return;
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [session, tenantId]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
      <Panel title={tenant.name} eyebrow="Tenant profile">
        <div className="space-y-3 text-sm leading-7 text-ink/75">
          <div>Plan: {tenant.plan}</div>
          <div>Status: {tenant.status}</div>
          <div>Brain profile: direct, concise, memory-first operations assistant.</div>
          <div>Suggested next step: complete onboarding interview and bind Telegram bot token.</div>
        </div>
      </Panel>

      <Panel title="Operational counters" eyebrow="Snapshot">
        <div className="space-y-3 text-sm text-ink/72">
          <div className="rounded-2xl bg-sand px-4 py-3">Cases: {tenant.cases}</div>
          <div className="rounded-2xl bg-sand px-4 py-3">Memories: {tenant.memories}</div>
          <div className="rounded-2xl bg-sand px-4 py-3">Users: {tenant.users}</div>
        </div>
      </Panel>
    </div>
  );
}
