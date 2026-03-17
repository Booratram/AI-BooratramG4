import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { MetricCard } from '../../components/metric-card';
import { Panel } from '../../components/panel';

const fallbackMetrics = [
  { label: 'Tenants', value: '3', hint: '1 pilot, 2 pipeline tenants' },
  { label: 'Cases / month', value: '67', hint: 'Knowledge base growth' },
  { label: 'DAU', value: '12', hint: 'Combined tenant activity' },
  { label: 'Avg response', value: '1.2s', hint: 'Current AI service target' },
];

export function Analytics() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState(fallbackMetrics);
  const [industries, setIndustries] = useState<string[]>(['AI / IT services']);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session) return;

      try {
        const item = await apiClient.getAdminAnalytics(session.accessToken);
        if (!active) return;

        setMetrics([
          { label: 'Tenants', value: String(item.totalTenants), hint: `${item.activeTenants} active` },
          { label: 'Cases / month', value: String(item.casesThisMonth), hint: `Total ${item.totalCases}` },
          { label: 'AI requests', value: String(item.totalAiRequests), hint: 'Logged requests' },
          { label: 'Avg response', value: `${item.avgResponseTime}ms`, hint: 'Based on aiRequestLog' },
        ]);
        setIndustries(item.topIndustries);
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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <Panel title="Platform interpretation" eyebrow="Admin readout">
        <div className="grid gap-4 md:grid-cols-3 text-sm text-ink/72">
          <div className="rounded-[24px] border border-ink/10 p-5">Top industries: {industries.join(', ') || 'No data yet'}</div>
          <div className="rounded-[24px] border border-ink/10 p-5">Fastest growth driver: seeded cases from pilot tenant</div>
          <div className="rounded-[24px] border border-ink/10 p-5">Current bottleneck: onboarding automation and integrations</div>
        </div>
      </Panel>
    </div>
  );
}
