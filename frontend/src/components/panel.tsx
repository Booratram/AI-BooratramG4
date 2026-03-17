interface PanelProps {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}

export function Panel({ title, eyebrow, children }: PanelProps) {
  return (
    <section className="rounded-[24px] border border-ink/10 bg-white p-5 shadow-sm">
      {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">{eyebrow}</div> : null}
      <div className="mt-1 font-display text-xl font-semibold text-ink">{title}</div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
