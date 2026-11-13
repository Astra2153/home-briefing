import { ASSUMPTIONS, DECISIONS, INTRO, NEXT_STEPS } from '@/content/writeup'

export function WriteUp() {
  return (
    <article>
      <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.025em] min-[500px]:text-[42px]">Write-up</h1>
      <p className="mt-3 max-w-[64ch] text-[16px] leading-relaxed text-muted-foreground">{INTRO}</p>

      <h2 className="mt-10 text-[22px] font-semibold tracking-[-0.015em]">Assumptions</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/85 marker:text-muted-foreground">
        {ASSUMPTIONS.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <h2 className="mt-10 text-[22px] font-semibold tracking-[-0.015em]">Key decisions</h2>
      <dl className="mt-3 space-y-4">
        {DECISIONS.map((d) => (
          <div key={d.title}>
            <dt className="text-[15.5px] font-semibold">{d.title}</dt>
            <dd className="mt-1 text-[15px] leading-relaxed text-foreground/80">{d.body}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-[22px] font-semibold tracking-[-0.015em]">What I'd do with more time</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/85 marker:text-muted-foreground">
        {NEXT_STEPS.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </article>
  )
}
