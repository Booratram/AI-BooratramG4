import { useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { Panel } from '../../components/panel';
import { knowledgeHits } from '../../store/demo-data';

export function Knowledge() {
  const { session } = useAuth();
  const [query, setQuery] = useState('как решали проблему с VK OAuth?');
  const [hits, setHits] = useState(knowledgeHits);

  async function search() {
    if (!session) return;

    try {
      const items = await apiClient.knowledgeSearch(session.accessToken, query);
      setHits(
        items.map((item) => ({
          title: item.content.split('|')[0]?.trim() || 'Memory hit',
          similarity: typeof item.similarity === 'number' ? item.similarity.toFixed(2) : 'recent',
          summary: item.content,
        })),
      );
    } catch {
      setHits(knowledgeHits);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
      <Panel title="Semantic search" eyebrow="Tenant-isolated">
        <div className="flex flex-col gap-3 md:flex-row">
          <input className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="rounded-2xl bg-ink px-5 py-3 text-sm font-medium text-white" onClick={search}>Search</button>
        </div>
        <div className="mt-4 space-y-3">
          {hits.map((hit) => (
            <div key={hit.title} className="rounded-[24px] border border-ink/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-ink">{hit.title}</div>
                <div className="rounded-full bg-ink px-3 py-1 text-xs text-white">{hit.similarity}</div>
              </div>
              <div className="mt-2 text-sm leading-7 text-ink/72">{hit.summary}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Isolation contract" eyebrow="Critical rule">
        <div className="rounded-[24px] bg-ink p-5 text-sm leading-7 text-white/82">
          Каждый semantic search в backend жёстко фильтруется по <code className="rounded bg-white/10 px-2 py-1 text-white">tenantId</code>. Память одного клиента не может попасть в выдачу другого.
        </div>
      </Panel>
    </div>
  );
}
