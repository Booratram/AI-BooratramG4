import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { Panel } from '../../components/panel';
import { cases as fallbackCases } from '../../store/demo-data';

export function Cases() {
  const { session } = useAuth();
  const [cases, setCases] = useState(fallbackCases);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session) return;

      try {
        const items = await apiClient.listCases(session.accessToken);
        if (!active) return;

        setCases(
          items.map((item) => ({
            title: item.title,
            category: item.category,
            impact: item.impact ?? 0,
            lesson: item.lessons ?? 'No lesson captured yet.',
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
    <Panel title="Business cases" eyebrow="Self-learning memory">
      <div className="space-y-4">
        {cases.map((item) => (
          <article key={item.title} className="rounded-[24px] border border-ink/10 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-display text-2xl text-ink">{item.title}</div>
              <div className="rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-moss">{item.category}</div>
              <div className="rounded-full bg-coral/10 px-3 py-1 text-xs font-semibold text-coral">Impact {item.impact}</div>
            </div>
            <div className="mt-3 text-sm leading-7 text-ink/72">{item.lesson}</div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
