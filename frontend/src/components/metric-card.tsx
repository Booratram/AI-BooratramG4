interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-[24px] border border-ink/10 bg-sand p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">{label}</div>
      <div className="mt-3 font-display text-4xl font-semibold text-ink">{value}</div>
      <div className="mt-2 text-sm text-ink/60">{hint}</div>
    </div>
  );
}
