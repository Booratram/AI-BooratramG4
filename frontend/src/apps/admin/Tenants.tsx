import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { Panel } from '../../components/panel';
import { adminTenants as fallbackTenants } from '../../store/demo-data';

export function Tenants() {
  const { session } = useAuth();
  const [tenants, setTenants] = useState(fallbackTenants);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session) return;

      try {
        const items = await apiClient.listAdminTenants(session.accessToken);
        if (!active) return;

        setTenants(
          items.map((tenant) => ({
            id: tenant.id,
            name: tenant.name,
            plan: tenant.plan,
            status: tenant.status,
            cases: tenant._count?.cases ?? 0,
            memories: tenant._count?.memories ?? 0,
            users: tenant._count?.users ?? 0,
          })),
        );
      } catch {
        if (!active) return;
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [session]);

  return (
    <Panel title="Platform tenants" eyebrow="BG Studio AI admin">
      <div className="space-y-3">
        {tenants.map((tenant) => (
          <Link
            key={tenant.id}
            to={`/admin/tenants/${tenant.id}`}
            className="block rounded-[24px] border border-ink/10 p-5 transition hover:border-ink/25"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-display text-2xl text-ink">{tenant.name}</div>
                <div className="mt-2 text-sm text-ink/60">{tenant.plan} plan · {tenant.status}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm text-ink/65">
                <div>{tenant.cases} cases</div>
                <div>{tenant.memories} memories</div>
                <div>{tenant.users} users</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
