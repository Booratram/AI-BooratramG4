import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { Panel } from '../../components/panel';
import { projects as fallbackProjects } from '../../store/demo-data';

export function Projects() {
  const { session } = useAuth();
  const [projects, setProjects] = useState(fallbackProjects);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!session) return;

      try {
        const items = await apiClient.listProjects(session.accessToken);
        if (!active) return;

        setProjects(
          items.map((project) => ({
            name: project.name,
            status: project.status,
            summary: project.description ?? 'No description yet',
            progress: `${Math.min(project.priority * 20, 100)}%`,
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
    <Panel title="Projects" eyebrow="Tenant portfolio">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <div key={project.name} className="rounded-[24px] border border-ink/10 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-ink/40">{project.status}</div>
            <div className="mt-2 font-display text-2xl text-ink">{project.name}</div>
            <div className="mt-3 text-sm text-ink/70">{project.summary}</div>
            <div className="mt-4 h-2 rounded-full bg-sand">
              <div className="h-2 rounded-full bg-coral" style={{ width: project.progress }} />
            </div>
            <div className="mt-2 text-sm text-ink/55">{project.progress} complete</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
