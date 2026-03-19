import { FormEvent, useEffect, useState } from 'react';
import { apiClient, type ProjectRecord } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import { Panel } from '../../components/panel';
import { translateProjectStatus } from '../../lib/labels';

interface ProjectFormState {
  name: string;
  description: string;
  priority: string;
  startDate: string;
  targetDate: string;
}

const initialForm: ProjectFormState = {
  name: '',
  description: '',
  priority: '3',
  startDate: '',
  targetDate: '',
};

function toIsoDate(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00`).toISOString();
}

function progressFromPriority(priority: number) {
  return `${Math.min(Math.max(priority, 1), 5) * 20}%`;
}

function formatProjectDate(value?: string) {
  if (!value) {
    return 'Не указана';
  }

  return new Date(value).toLocaleDateString('ru-RU');
}

export function Projects() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [form, setForm] = useState<ProjectFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadProjects() {
    if (!session) {
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const items = await apiClient.listProjects(session.accessToken);
      setProjects(items);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить проекты');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [session]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !form.name.trim()) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      await apiClient.createProject(session.accessToken, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priority: Number(form.priority) || 3,
        startDate: toIsoDate(form.startDate),
        targetDate: toIsoDate(form.targetDate),
      });

      setForm(initialForm);
      setNotice('Проект создан и уже доступен в системе.');
      await loadProjects();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось создать проект');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <Panel title="Новый проект" eyebrow="Ввод реальных данных">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-ink/75">
            Название проекта
            <input
              className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3"
              placeholder="Например: AI CRM для отдела продаж"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>

          <label className="block text-sm text-ink/75">
            Описание
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border border-ink/10 px-4 py-3"
              placeholder="Коротко опишите цель проекта, стадию и ожидаемый результат"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm text-ink/75">
              Приоритет
              <input
                className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3"
                min="1"
                max="5"
                type="number"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              />
            </label>
            <label className="block text-sm text-ink/75">
              Дата старта
              <input
                className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3"
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
            </label>
            <label className="block text-sm text-ink/75">
              Целевая дата
              <input
                className="mt-2 w-full rounded-2xl border border-ink/10 px-4 py-3"
                type="date"
                value={form.targetDate}
                onChange={(event) => setForm({ ...form, targetDate: event.target.value })}
              />
            </label>
          </div>

          {notice ? <div className="rounded-2xl bg-sand px-4 py-3 text-sm text-ink/80">{notice}</div> : null}

          <button className="rounded-2xl bg-coral px-5 py-3 font-medium text-white" disabled={saving} type="submit">
            {saving ? 'Сохраняем...' : 'Создать проект'}
          </button>
        </form>
      </Panel>

      <Panel title="Реальные проекты компании" eyebrow="Портфель компании">
        {loading ? <div className="text-sm text-ink/60">Загружаем проекты...</div> : null}
        {loadError ? <div className="rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral">{loadError}</div> : null}
        {!loading && !loadError && projects.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-ink/15 p-6 text-sm leading-7 text-ink/65">
            Проектов пока нет. Создайте первый проект слева, и он сразу появится в системе.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {projects.map((project) => {
            const progress = progressFromPriority(project.priority);
            return (
              <div key={project.id} className="rounded-[24px] border border-ink/10 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-ink/40">{translateProjectStatus(project.status)}</div>
                <div className="mt-2 font-display text-2xl text-ink">{project.name}</div>
                <div className="mt-3 text-sm text-ink/70">{project.description ?? 'Описание проекта пока не заполнено.'}</div>
                <div className="mt-4 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-coral" style={{ width: progress }} />
                </div>
                <div className="mt-2 text-sm text-ink/55">Приоритет: {project.priority}/5</div>
                <div className="mt-3 text-xs text-ink/50">Старт: {formatProjectDate(project.startDate)} · Цель: {formatProjectDate(project.targetDate)}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}