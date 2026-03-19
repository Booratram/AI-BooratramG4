import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { Panel } from '../../components/panel';
import { translateEventType } from '../../lib/labels';

const fallbackEvents = [
  { time: '10:00', title: 'Архитектурный проход по G4 backend', type: 'Ревью' },
  { time: '14:00', title: 'Созвон по ai-publisher после обеда', type: 'Встреча' },
  { time: '17:30', title: 'Обновить pitch для BG Studio AI', type: 'Фокус-блок' },
];

export function Calendar() {
  const { session } = useAuth();
  const [events, setEvents] = useState(fallbackEvents);
  const [recommendation, setRecommendation] = useState('Сначала зафиксируй критические дедлайны на утро, затем сгруппируй встречи по проектам.');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session) return;

      try {
        const [eventItems, suggestion] = await Promise.all([
          apiClient.listCalendarWeek(session.accessToken),
          apiClient.suggestWeek(session.accessToken),
        ]);

        if (!active) return;

        setEvents(
          eventItems.map((item) => ({
            time: new Date(item.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            title: item.title,
            type: translateEventType(item.type),
          })),
        );
        setRecommendation(suggestion.recommendation);
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
    <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      <Panel title="План на неделю" eyebrow="Умное планирование">
        <div className="space-y-3">
          {events.map((event) => (
            <div key={`${event.time}-${event.title}`} className="flex items-center justify-between rounded-2xl border border-ink/10 px-4 py-4">
              <div>
                <div className="font-medium text-ink">{event.title}</div>
                <div className="text-sm text-ink/55">{event.type}</div>
              </div>
              <div className="rounded-full bg-ink px-3 py-1 text-sm text-white">{event.time}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Рекомендация по расписанию" eyebrow="Подсказка от API">
        <div className="rounded-[24px] bg-sand p-5 text-sm leading-7 text-ink/75">{recommendation}</div>
      </Panel>
    </div>
  );
}