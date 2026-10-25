import Link from "next/link";
import { API } from "@/lib/api";
import { WordIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

type Methodology = {
  heuristicsVersion: string;
  termsVersion: string;
  quality: { question: string; source: string; maxPoints: number; rules: { id: string; description: string; weight: number; kind: 'points' | 'multiplier' }[] };
  popularity: { question: string; version: string; source: string; formula?: string; weights: { returning: number; reach: number }; returnBands: [number, number][]; reachBands: [number, number][]; caveat: string; missing: string };
  verdict: { rule: string; thresholds: { craft: number; popular: number }; sloppy?: string; sloppyFormula?: string };
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
        One question, <em>was it worth it?</em>, answered as a percentage of slop. Two things get measured, each out of 100:
        {" "}<strong className="text-ink">Popularity</strong>, do the people who find it actually use it, read from the owner&apos;s Google Analytics;
        and <strong className="text-ink">Quality</strong>, is this real, maintained work by more than one person over time, read from the GitHub repository.
        The two are averaged and the average is turned upside down, so a thing nobody uses and nobody maintains is 100% sloppy and the best possible outcome is 0%.
        The same two measurements also become the two-word verdict: <strong className="text-ink">Fringe</strong> or <strong className="text-ink">Popular</strong>, <strong className="text-ink">Slop</strong> or <strong className="text-ink">Craft</strong>.
      </p>
      <p className="mt-4 text-ink-2 leading-relaxed">
        Nothing connected is unknown, not zero: no analytics means an unknown Popularity, no repository means an unknown Quality, and the percentage stays unknown until both are in. Connected and empty is zero.
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
              <h2 className="display text-3xl">Popularity</h2>
              <span className="text-xs text-muted">v{m.popularity.version}</span>
            </div>
            <p className="mt-2 text-ink-2">{m.popularity.question}</p>
            <p className="text-sm text-muted">{m.popularity.source}</p>
            {m.popularity.formula && <p className="mt-2 text-sm text-ink-2">{m.popularity.formula}</p>}
            <div className="card mt-4 p-4 text-sm grid sm:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold">Returning (moves half)</div>
                <div className="text-muted">returning active users / active users</div>
                <Bands bands={m.popularity.returnBands} />
              </div>
              <div>
                <div className="font-semibold">Reach (multiplies everything)</div>
                <div className="text-muted">log10 of active users in 30 days</div>
                <Bands bands={m.popularity.reachBands} pct={false} />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{m.popularity.missing} {m.popularity.caveat}</p>
          </section>

          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-3xl">Quality</h2>
              <span className="text-xs text-muted">heuristics v{m.heuristicsVersion}</span>
            </div>
            <p className="mt-2 text-ink-2">{m.quality.question}</p>
            <p className="text-sm text-muted">{m.quality.source}</p>
            <ul className="card mt-4 divide-y divide-line">
              {m.quality.rules.map((r) => (
                <li key={r.id} className="p-4 grid grid-cols-[1fr_auto] sm:grid-cols-[6rem_1fr_4rem] gap-x-3 gap-y-1 items-start">
                  <a className="text-sm underline decoration-line hover:decoration-ink" href={`https://github.com/jayjaychicago/isitslop/blob/main/api/src/heuristics/quality.ts`} title="View this rule's source"><code>{r.id}</code></a>
                  <span className="text-sm text-ink-2 order-3 sm:order-none col-span-2 sm:col-span-1">{r.description}</span>
                  <span className="text-right font-semibold tabular-nums order-2 sm:order-none">{r.kind === "multiplier" ? "×" : `+${r.weight}`}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">Three things, all of which take time; weights sum to {m.quality.maxPoints}. Nothing that can be scaffolded in an afternoon counts: no README, license, CI, tests, stars or forks. A repo born today with one author scores 0, and full credit on history needs twelve months of pushes. No repo linked is unknown, not zero. Archived repos are capped at 20. Read with the owner&apos;s own GitHub login, so private repos work and nothing is shared.</p>
          </section>

          <section className="mt-10">
            <h2 className="display text-3xl">The number</h2>
            <p className="mt-2 text-ink-2">
              Popularity and Quality are averaged, then subtracted from 100. That is the percentage on every entry: how sloppy it is. Red from 50% up, green below. Unknown if either half is unknown.
            </p>
            <div className="card mt-4 p-4">
              <code className="text-base">{m.verdict.sloppyFormula ?? "sloppy = 100 − round((Popularity + Quality) / 2)"}</code>
              <table className="mt-3 text-sm tabular-nums">
                <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="text-left pr-6 font-semibold">Popularity</th><th className="text-left pr-6 font-semibold">Quality</th><th className="text-left font-semibold">Sloppy</th></tr></thead>
                <tbody>
                  <tr><td className="pr-6">0</td><td className="pr-6">0</td><td className="text-slop font-semibold">100%</td></tr>
                  <tr><td className="pr-6">0</td><td className="pr-6">84</td><td className="text-slop font-semibold">58%</td></tr>
                  <tr><td className="pr-6">60</td><td className="pr-6">80</td><td className="text-fresh font-semibold">30%</td></tr>
                  <tr><td className="pr-6">100</td><td className="pr-6">100</td><td className="text-fresh font-semibold">0%</td></tr>
                  <tr><td className="pr-6">unknown</td><td className="pr-6">80</td><td className="text-muted font-semibold">unknown</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="display text-3xl">The words</h2>
            <p className="mt-2 text-ink-2">{m.verdict.rule}</p>
            <p className="text-sm text-muted">Popular at {m.verdict.thresholds.popular} and above, Craft at {m.verdict.thresholds.craft} and above.</p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 display text-2xl">
              <li className="text-mixed flex items-center gap-2"><WordIcon word="fringe" /> Fringe <span className="text-sm text-muted font-sans">popularity below the cut</span></li>
              <li className="text-fresh flex items-center gap-2"><WordIcon word="popular" /> Popular <span className="text-sm text-muted font-sans">popularity at or above</span></li>
              <li className="text-slop flex items-center gap-2"><WordIcon word="slop" /> Slop <span className="text-sm text-muted font-sans">quality below the cut</span></li>
              <li className="text-fresh flex items-center gap-2"><WordIcon word="craft" /> Craft <span className="text-sm text-muted font-sans">quality at or above</span></li>
              <li className="text-muted flex items-center gap-2"><WordIcon word="unknown" /> Unknown <span className="text-sm text-muted font-sans">nothing connected</span></li>
            </ul>
          </section>

          <section className="mt-10 text-sm text-muted">
            <p>Grades do not go stale: popularity is re-read every day and quality on the first of every month, from the owner&apos;s connected accounts. The history on each entry page shows the drift.</p>
            <p className="mt-2">Terms version in force: {m.termsVersion}. Grades keep the heuristics version they were computed with; re-grading uses the current rules.</p>
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
