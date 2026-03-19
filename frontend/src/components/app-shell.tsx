import { NavLink } from 'react-router-dom';

export interface NavItem {
  label: string;
  to: string;
}

interface AppShellProps {
  brand: string;
  title: string;
  subtitle: string;
  navItems: NavItem[];
  accent: 'coral' | 'moss';
  children: React.ReactNode;
}

export function AppShell({ brand, title, subtitle, navItems, accent, children }: AppShellProps) {
  const accentClass = accent === 'coral' ? 'bg-coral text-white' : 'bg-moss text-white';

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-card backdrop-blur">
        <aside className="hidden w-72 shrink-0 border-r border-ink/10 bg-ink px-6 py-8 text-white lg:block">
          <div className="mb-10">
            <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${accentClass}`}>
              {brand}
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight">{title}</h1>
            <p className="mt-3 text-sm text-white/70">{subtitle}</p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm transition ${
                    isActive ? 'bg-white text-ink shadow-sm' : 'text-white/72 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/75">
            <div className="font-display text-lg text-white">Память и операционная работа</div>
            <p className="mt-2">Каждый новый кейс, проект и дедлайн расширяет контекст ответа и делает G4 точнее в следующем решении.</p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="border-b border-ink/10 px-5 py-5 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-display text-2xl font-semibold text-ink">{title}</div>
                <p className="mt-1 max-w-3xl text-sm text-ink/60">{subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="rounded-full border border-ink/10 bg-sand px-4 py-2">Русскоязычный рабочий контур</div>
                <div className="rounded-full border border-ink/10 bg-white px-4 py-2">AI-ядро DeepSeek</div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 lg:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-2xl px-4 py-3 text-sm ${isActive ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </header>
          <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}