import { Panel } from '../../components/panel';
import { onboardingSteps } from '../../store/demo-data';

export function Onboarding() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
      <Panel title="Tenant onboarding flow" eyebrow="Under 30 minutes target">
        <div className="space-y-3">
          {onboardingSteps.map((step, index) => (
            <div key={step} className="flex items-start gap-4 rounded-2xl border border-ink/10 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss text-sm font-semibold text-white">{index + 1}</div>
              <div className="text-sm leading-7 text-ink/75">{step}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Interview seed prompts" eyebrow="AI-assisted">
        <div className="space-y-3 text-sm leading-7 text-ink/72">
          <div className="rounded-2xl bg-sand px-4 py-3">Расскажи о 3 главных проблемах в бизнесе за последний год.</div>
          <div className="rounded-2xl bg-sand px-4 py-3">Какие решения сработали лучше всего и почему?</div>
          <div className="rounded-2xl bg-sand px-4 py-3">Что бы ты сделал иначе, если бы запускал этот процесс заново?</div>
        </div>
      </Panel>
    </div>
  );
}
