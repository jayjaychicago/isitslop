import Link from "next/link";

export const metadata = { title: "Change the rules · Is it slop?" };

const REPO = "https://github.com/jayjaychicago/isitslop";

export default function Contribute() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-5xl sm:text-6xl leading-tight">
        Don&apos;t like the score? <em>Change the rules.</em>
      </h1>
      <p className="mt-5 text-lg text-ink-2 leading-relaxed">
        Every point of every score on this site comes from a rule in one file in a public repository. There is no model, no secret weighting, no
        editorial desk. If a rule is wrong, the fix is a pull request, and it applies to everyone.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a className="btn" href={`${REPO}/blob/main/api/src/heuristics/critics.ts`}>Read the rules (critics.ts)</a>
        <a className="btn btn-ghost" href={REPO}>Open the repo</a>
        <a className="btn btn-ghost" href={`${REPO}/blob/main/foundation.md`}>Read foundation.md</a>
      </div>

      <section className="mt-12">
        <h2 className="display text-3xl">How a score is made</h2>
        <ol className="mt-3 space-y-3 text-ink-2">
          <li className="card p-4"><strong className="text-ink">1. Fetch.</strong> At grading time the API fetches your landing page or README once, as <code>isitslop-bot</code>. Scripts, styles and code blocks are stripped; what is left is the text a visitor would read.</li>
          <li className="card p-4"><strong className="text-ink">2. Run the rules.</strong> Each rule in <code>critics.ts</code> gets the text and returns a number between 0 and 1 plus the phrases it matched. Rules have weights. The weighted sum, clamped to 0 to 100, is the Critics score.</li>
          <li className="card p-4"><strong className="text-ink">3. People.</strong> The owner&apos;s self-reported conversion and return rate go through the bands in <code>people.ts</code>.</li>
          <li className="card p-4"><strong className="text-ink">4. Verdict.</strong> <code>verdict.ts</code> combines the two halves, Rotten Tomatoes style. The <Link href="/methodology" className="underline">methodology page</Link> is generated from these files.</li>
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="display text-3xl">A rule, in full</h2>
        <p className="mt-2 text-ink-2">This is the real <code>who</code> rule as of v0. It is a regex and a sentence. That is the level of sophistication we are at, on purpose.</p>
        <pre className="mt-3">{`{
  id: 'who',
  description:
    'It names who it is for. "For everyone" is for no one. We look for an explicit ' +
    'audience ("for indie developers", "built for clinics", "if you are a landlord").',
  weight: 15,
  run: (_x, lead) => {
    const ev = matches(WHO, lead);
    return { score: clamp01(ev.length / 1.5), evidence: ev };
  },
}`}</pre>
      </section>

      <section className="mt-12">
        <h2 className="display text-3xl">Change a rule in four steps</h2>
        <ol className="mt-3 space-y-3 text-ink-2">
          <li className="card p-4"><strong className="text-ink">Fork and clone.</strong> <code>git clone {REPO}.git</code>, then <code>cd api && npm install</code>. The tests need no database and no network.</li>
          <li className="card p-4"><strong className="text-ink">Edit <code>api/src/heuristics/critics.ts</code>.</strong> Add a rule or change one. Write the <code>description</code> for a non-programmer; it appears verbatim on the methodology page. Bump <code>HEURISTICS_VERSION</code>.</li>
          <li className="card p-4"><strong className="text-ink">Prove it.</strong> Add a case to <code>api/test/heuristics.test.ts</code> showing a page that should score differently and why. Run <code>npm test</code>. Try it on real pages with <code>npm run dev</code> and <code>GET /v1/preview?url=…</code>.</li>
          <li className="card p-4"><strong className="text-ink">Open a pull request.</strong> Say which kind of page the rule helps and which kind it might hurt. Merged rules deploy to everyone, and old grades keep the version they were computed with.</li>
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="display text-3xl">The one rule about the rules</h2>
        <p className="mt-2 text-ink-2 leading-relaxed">
          <strong className="text-ink">It must stay self-sustaining.</strong> No LLM calls, no paid data vendors, nothing metered per request. The whole
          service runs on free tiers so that nobody has to pay for it to keep existing and nobody can be pressured by whoever pays. A rule that
          needs money to run will not be merged, however clever. Everything else is negotiable.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="display text-3xl">Open problems worth a pull request</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-3 text-sm text-ink-2">
          <li className="card p-4">Verified analytics for the People score (GA4, PostHog, Plausible, Stripe) with owner-supplied read-only credentials, so numbers stop being self-reported.</li>
          <li className="card p-4">Private GitHub repos through a GitHub App or a fine-grained token.</li>
          <li className="card p-4">Text extraction for JavaScript-rendered landing pages without a headless browser.</li>
          <li className="card p-4">Rules in languages other than English. Everything in v0 is an English regex.</li>
          <li className="card p-4">A badge endpoint so owners can show their score in a README.</li>
          <li className="card p-4">A &quot;why&quot; detector that is smarter than looking for the word &quot;because&quot;.</li>
        </ul>
        <p className="mt-4 text-sm text-muted">
          Appeals are the other way in. Every appeal on an entry page is public, and an accepted appeal becomes a rule change. See <a className="underline" href={`${REPO}/blob/main/CONTRIBUTING.md`}>CONTRIBUTING.md</a>.
        </p>
      </section>
    </div>
  );
}
