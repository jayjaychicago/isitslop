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
        <a className="btn" href={`${REPO}/blob/main/api/src/heuristics/quality.ts`}>Read the rules (quality.ts)</a>
        <a className="btn btn-ghost" href={REPO}>Open the repo</a>
        <a className="btn btn-ghost" href={`${REPO}/blob/main/foundation.md`}>Read foundation.md</a>
      </div>

      <section className="mt-12">
        <h2 className="display text-3xl">How a score is made</h2>
        <ol className="mt-3 space-y-3 text-ink-2">
          <li className="card p-4"><strong className="text-ink">1. Read the repo.</strong> At grading time the API reads the GitHub repository with the owner&apos;s own login: commit history, contributors, issues, releases, the file tree, the README. About ten API calls, nothing stored but the result.</li>
          <li className="card p-4"><strong className="text-ink">2. Run the rules.</strong> Each rule in <code>quality.ts</code> turns those facts into a number between 0 and 1 plus the evidence it saw. Only things that take time score points, with weights summing to 100; a README, license, CI and tests are a multiplier that can only lower the score. That is the Quality score: real, maintained work by more than one person over time.</li>
          <li className="card p-4"><strong className="text-ink">3. Popularity.</strong> The API reads the owner&apos;s connected analytics (<code>analytics.ts</code>): unique visitors in 30 days and how many came back on another day. The bands in <code>popularity.ts</code> turn that into the score. This answers: do the people who find it use it?</li>
          <li className="card p-4"><strong className="text-ink">4. Verdict.</strong> <code>verdict.ts</code> combines the two halves: both good is Not slop, either bad is Slop, anything else is Mixed. The <Link href="/methodology" className="underline">methodology page</Link> is generated from these files.</li>
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="display text-3xl">A rule, in full</h2>
        <p className="mt-2 text-ink-2">This is the real <code>contributors</code> rule as of v0.3. A sentence, a weight, and a few lines of arithmetic. That is the level of sophistication we are at, on purpose.</p>
        <pre className="mt-3">{`{
  id: 'contributors',
  description:
    'People other than the author have put real work in: humans (not bots) ' +
    'with at least two commits, not counting the first one. One person is zero.',
  weight: 25,
  run: (f) => ({
    score: band(Math.max(0, f.humansWithTwoPlusCommits - 1), [[0, 0], [1, 0.4], [3, 0.75], [7, 1]]),
    evidence: [\`\${f.humansWithTwoPlusCommits} humans with 2+ commits\`],
  }),
}`}</pre>
      </section>

      <section className="mt-12">
        <h2 className="display text-3xl">Change a rule in four steps</h2>
        <ol className="mt-3 space-y-3 text-ink-2">
          <li className="card p-4"><strong className="text-ink">Fork and clone.</strong> <code>git clone {REPO}.git</code>, then <code>cd api && npm install</code>. The tests need no database and no network.</li>
          <li className="card p-4"><strong className="text-ink">Edit <code>api/src/heuristics/quality.ts</code>.</strong> Add a signal or change one. If it needs a fact we do not collect yet, add it to <code>collectRepoFacts</code>. Write the <code>description</code> for a non-programmer; it appears verbatim on the methodology page. Bump <code>QUALITY_VERSION</code>.</li>
          <li className="card p-4"><strong className="text-ink">Prove it.</strong> Add a case to <code>api/test/heuristics.test.ts</code> showing a repo shape that should score differently and why. Run <code>npm test</code>. Try it on real repos with <code>npm run dev</code> and <code>GET /v1/preview?url=github.com/owner/repo</code>.</li>
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
          <li className="card p-4">More analytics providers for Popularity: Google Analytics, Fathom, Umami, Cloudflare. Each is one object in <code>analytics.ts</code>.</li>
          <li className="card p-4">GitLab, Codeberg and self-hosted repos. Everything in v0 is GitHub.</li>
          <li className="card p-4">Better fraud resistance: detecting commit-cadence bots, sock-puppet contributors, issue farms.</li>
          <li className="card p-4">Pull request signals: reviewed merges from outside contributors.</li>
          <li className="card p-4">A badge endpoint so owners can show their score in a README.</li>
          <li className="card p-4">Signals for things that are not code at all.</li>
        </ul>
        <p className="mt-4 text-sm text-muted">
          Appeals are the other way in. Every appeal on an entry page is public, and an accepted appeal becomes a rule change. See <a className="underline" href={`${REPO}/blob/main/CONTRIBUTING.md`}>CONTRIBUTING.md</a>.
        </p>
      </section>
    </div>
  );
}
