import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { MetricCard } from '../../components/metric-card';
import { Panel } from '../../components/panel';

const fallbackMetrics = [
  { label: 'Тенанты', value: '3', hint: '1 пилот, 2 воронка' },
  { label: 'Кейсы / месяц', value: '67', hint: 'Рост базы знаний' },
  { label: 'DAU', value: '12', hint: 'Суммарная активность' },
  { label: 'Средний ответ', value: '1.2s', hint: 'Целевой SLA AI' },
];

export function Analytics() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState(fallbackMetrics);
  const [industries, setIndustries] = useState<string[]>(['AI / IT услуги']);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session) return;

      try {
        const item = await apiClient.getAdminAnalytics(session.accessToken);
        if (!active) return;

        setMetrics([
          { label: 'Тенанты', value: String(item.totalTenants), hint: `${item.activeTenants} активных` },
          { label: 'Кейсы / месяц', value: String(item.casesThisMonth), hint: `Всего ${item.totalCases}` },
          { label: 'AI-запросы', value: String(item.totalAiRequests), hint: 'Записано в журнал' },
          { label: 'Средний ответ', value: `${item.avgResponseTime}ms`, hint: 'По aiRequestLog' },
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
      <Panel title="Интерпретация платформы" eyebrow="Админский срез">
        <div className="grid gap-4 md:grid-cols-3 text-sm text-ink/72">
          <div className="rounded-[24px] border border-ink/10 p-5">Ключевые отрасли: {industries.join(', ') || 'Данных пока нет'}</div>
          <div className="rounded-[24px] border border-ink/10 p-5">Главный драйвер роста: кейсы и память пилотного тенанта</div>
          <div className="rounded-[24px] border border-ink/10 p-5">Текущее узкое место: автоматизация онбординга и интеграций</div>
        </div>
      </Panel>
    </div>
  );
}