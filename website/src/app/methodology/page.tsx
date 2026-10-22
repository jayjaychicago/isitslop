import Link from "next/link";
import { API } from "@/lib/api";

export const dynamic = "force-dynamic";

type Methodology = {
  heuristicsVersion: string;
  termsVersion: string;
  quality: { question: string; source: string; maxPoints: number; rules: { id: string; description: string; weight: number; kind: 'points' | 'multiplier' }[] };
  popularity: { question: string; version: string; source: string; weights: { returning: number; reach: number }; returnBands: [number, number][]; reachBands: [number, number][]; caveat: string; missing: string };
  verdict: { rule: string; thresholds: { craft: number; popular: number } };
};

async function load(): Promise<Methodology | null> {
  try {
    const r = await fetch(`${API}/methodology`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as Methodology;
  } catch {
    return null;
  }
}

export default async function MethodologyPage() {
  const m = await load();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-5xl">What the score is made of</h1>
      <p className="mt-4 text-ink-2 leading-relaxed">
        The score has two halves. <strong className="text-ink">Quality</strong> asks whether this is real, maintained work by more than one person
        over time, read from the GitHub repository: a year of pushes, other humans committing, issues being filed. <strong className="text-ink">Popularity</strong> asks
        whether the people who find it actually use it, read from the owner&apos;s Google Analytics. The verdict is two words, one per axis: below the cut on
        quality is <strong className="text-ink">Slop</strong>, above is <strong className="text-ink">Craft</strong>; below the cut on popularity is <strong className="text-ink">Fringe</strong>, above is <strong className="text-ink">Popular</strong>. Nothing connected is Unknown, not zero. Connected and empty is zero.
      </p>
      <p className="mt-4 text-ink-2 leading-relaxed">
        This page is generated from the code that computes the score, so it is always current. Every rule is a plain function anyone can read in{" "}
        <a className="underline" href="https://github.com/jayjaychicago/isitslop/tree/main/api/src/heuristics">api/src/heuristics</a>. No LLMs, no paid data, no stars.
      </p>
      <div className="mt-5 card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-ink-2">Think a rule is wrong? It is one file. Change it for everyone.</span>
        <div className="flex gap-2 shrink-0">
          <Link href="/contribute" className="btn text-sm">How to change the rules</Link>
          <a className="btn btn-ghost text-sm" href="https://github.com/jayjaychicago/isitslop/blob/main/api/src/heuristics/quality.ts">quality.ts</a>
        </div>
      </div>

      {!m ? (
        <p className="mt-8 text-slop">The API is unreachable right now. The rules live at the link above.</p>
      ) : (
        <>
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-3xl">Quality</h2>
              <span className="text-xs text-muted">heuristics v{m.heuristicsVersion}</span>
            </div>
            <p className="mt-2 text-ink-2">{m.quality.question}</p>
            <p className="text-sm text-muted">{m.quality.source}</p>
            <ul className="card mt-4 divide-y divide-line">
              {m.quality.rules.map((r) => (
                <li key={r.id} className="p-4 grid grid-cols-[6rem_1fr_4rem] gap-3 items-start">
                  <a className="text-sm underline decoration-line hover:decoration-ink" href={`https://github.com/jayjaychicago/isitslop/blob/main/api/src/heuristics/quality.ts`} title="View this rule's source"><code>{r.id}</code></a>
                  <span className="text-sm text-ink-2">{r.description}</span>
                  <span className="text-right font-semibold tabular-nums">{r.kind === "multiplier" ? "×" : `+${r.weight}`}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">Three things, all of which take time; weights sum to {m.quality.maxPoints}. Nothing that can be scaffolded in an afternoon counts: no README, license, CI, tests, stars or forks. A repo born today with one author scores 0, and full credit on history needs twelve months of pushes. No repo linked is unknown, not zero. Archived repos are capped at 20. Read with the owner&apos;s own GitHub login, so private repos work and nothing is shared.</p>
          </section>

          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-3xl">Popularity</h2>
              <span className="text-xs text-muted">v{m.popularity.version}</span>
            </div>
            <p className="mt-2 text-ink-2">{m.popularity.question}</p>
            <p className="text-sm text-muted">{m.popularity.source}</p>
            <div className="card mt-4 p-4 text-sm grid sm:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold">Returning (weight {m.popularity.weights.returning})</div>
                <div className="text-muted">returning active users / active users</div>
                <Bands bands={m.popularity.returnBands} />
              </div>
              <div>
                <div className="font-semibold">Reach (weight {m.popularity.weights.reach})</div>
                <div className="text-muted">log10 of active users in 30 days</div>
                <Bands bands={m.popularity.reachBands} pct={false} />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{m.popularity.missing} {m.popularity.caveat}</p>
          </section>

          <section className="mt-10">
            <h2 className="display text-3xl">Verdict</h2>
            <p className="mt-2 text-ink-2">{m.verdict.rule}</p>
            <p className="text-sm text-muted">Craft at {m.verdict.thresholds.craft} and above, Popular at {m.verdict.thresholds.popular} and above.</p>
          </section>

          <section className="mt-10 text-sm text-muted">
            <p>Terms version in force: {m.termsVersion}. Grades keep the heuristics version they were computed with; re-grading uses the current rules.</p>
          </section>
        </>
      )}
    </div>
  );
}

function Bands({ bands, pct = true }: { bands: [number, number][]; pct?: boolean }) {
  return (
    <table className="mt-2 text-xs tabular-nums">
      <tbody>
        {bands.map(([x, y]) => (
          <tr key={x}><td className="pr-4 text-muted">{pct ? `${(x * 100).toFixed(1)}%` : `${Math.round(10 ** x).toLocaleString()} visitors`}</td><td>{Math.round(y * 100)} pts</td></tr>
        ))}
      </tbody>
    </table>
  );
}
