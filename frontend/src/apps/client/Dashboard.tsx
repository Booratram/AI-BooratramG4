import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { MetricCard } from '../../components/metric-card';
import { Panel } from '../../components/panel';
import { translatePriority, translateProjectStatus } from '../../lib/labels';
import { dashboardMetrics, deadlines as fallbackDeadlines, projects as fallbackProjects } from '../../store/demo-data';

export function Dashboard() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState(dashboardMetrics);
  const [deadlines, setDeadlines] = useState(fallbackDeadlines);
  const [projects, setProjects] = useState(fallbackProjects);
  const [tenantName, setTenantName] = useState('BG Studio AI');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session) return;

      try {
        const [tenant, projectItems, caseItems, deadlineItems] = await Promise.all([
          apiClient.getCurrentTenant(session.accessToken),
          apiClient.listProjects(session.accessToken),
          apiClient.listCases(session.accessToken),
          apiClient.listDeadlines(session.accessToken),
        ]);

        if (!active) return;

        setTenantName(tenant.name);
        setMetrics([
          { label: 'Проекты', value: String(projectItems.length), hint: 'Активный контур компании' },
          { label: 'Кейсы', value: String(caseItems.length), hint: 'База знаний и памяти' },
          { label: 'Дедлайны', value: String(deadlineItems.length), hint: 'Текущие обязательства' },
          { label: 'AI-ядро', value: tenant.brainName, hint: `Язык: ${tenant.language}` },
        ]);
        setProjects(
          projectItems.map((item) => ({
            name: item.name,
            status: translateProjectStatus(item.status),
            summary: item.description ?? 'Описание проекта пока не заполнено.',
            progress: `Приоритет ${item.priority}/5`,
          })),
        );
        setDeadlines(
          deadlineItems.map((item) => ({
            title: item.title,
            due: new Date(item.dueAt).toLocaleString('ru-RU'),
            priority: translatePriority(item.priority),
            note: item.description ?? item.status,
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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <Panel title="Ежедневная сводка" eyebrow="AI-обзор">
          <div className="rounded-[24px] bg-ink p-6 text-white">
            <div className="text-sm text-white/60">{tenantName}</div>
            <div className="mt-3 max-w-2xl text-lg leading-8">
              Платформа уже работает от реального API. Добавляйте проекты, кейсы, дедлайны и знания компании, и BooratramG4 начнёт опираться на ваши реальные данные.
            </div>
          </div>
        </Panel>

        <Panel title="Приоритетные дедлайны" eyebrow="Сегодня">
          <div className="space-y-3">
            {deadlines.map((item) => (
              <div key={item.title} className="rounded-2xl border border-ink/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-ink">{item.title}</div>
                  <div className="rounded-full bg-coral/10 px-3 py-1 text-xs font-semibold text-coral">{item.priority}</div>
                </div>
                <div className="mt-2 text-sm text-ink/60">{item.due}</div>
                <div className="mt-2 text-sm text-ink/70">{item.note}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Пульс проектов" eyebrow="Операционная работа">
        <div className="grid gap-4 md:grid-cols-3">
          {projects.map((project) => (
            <div key={project.name} className="rounded-[24px] border border-ink/10 p-5">
              <div className="text-sm text-ink/55">{project.status}</div>
              <div className="mt-2 font-display text-2xl text-ink">{project.name}</div>
              <div className="mt-2 text-sm text-ink/70">{project.summary}</div>
              <div className="mt-4 inline-flex rounded-full bg-moss/10 px-3 py-1 text-sm font-medium text-moss">{project.progress}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}