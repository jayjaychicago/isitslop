import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About · Is it slop?", description: "What isitslop.org is, what it is not, and how a thing gets graded." };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-5xl">About</h1>

      <p className="mt-5 text-lg text-ink-2 leading-relaxed">
        AI can build anything. This site asks whether a thing was worth building, and answers in two words.
      </p>

      <section className="mt-8">
        <h2 className="display text-3xl">Two plain questions</h2>
        <p className="mt-2 text-ink-2 leading-relaxed">
          <strong className="text-ink">Popularity</strong>: do the people who find it actually use it? Read from the owner&apos;s Google Analytics: who visited, who came back.
          Below the cut is <span className="text-mixed font-semibold">Fringe</span>, above is <span className="text-fresh font-semibold">Popular</span>.
        </p>
        <p className="mt-2 text-ink-2 leading-relaxed">
          <strong className="text-ink">Quality</strong>: is this real, maintained work by more than one person over time? Read from the GitHub repo, using signals you cannot buy, so no stars, no README, no badges.
          Below the cut is <span className="text-slop font-semibold">Slop</span>, above is <span className="text-fresh font-semibold">Craft</span>.
        </p>
        <p className="mt-2 text-ink-2 leading-relaxed">
          The two average into one <strong className="text-ink">sloppiness score</strong> out of 100, higher is better. Nothing connected is unknown, not zero, and the total is unknown until both halves are. The exact rules, with their weights, are on the <Link href="/methodology" className="underline">methodology</Link> page, which is generated from the code that computes the score.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="display text-3xl">How a thing gets graded</h2>
        <ol className="mt-3 flex flex-col gap-3 text-ink-2 leading-relaxed">
          <li><strong className="text-ink">1. Add it and prove it is yours.</strong> Paste a URL or a GitHub repo and sign in with GitHub. A site is yours after a DNS record, a well-known file, or an email to admin@ your domain. A repo is yours if your GitHub account can push to it.</li>
          <li><strong className="text-ink">2. Connect GitHub and Google Analytics.</strong> Quality is read from your repository, Popularity from your Google Analytics property. Both read-only, with your own login. Private repos work and are never named.</li>
          <li><strong className="text-ink">3. Ask for a grade.</strong> Only owners get graded. Accept the <Link href="/terms" className="underline">terms</Link>, the public rules run, the result is published. Grades refresh on their own: Popularity daily, Quality monthly. You can appeal, publicly.</li>
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="display text-3xl">What it is not</h2>
        <p className="mt-2 text-ink-2 leading-relaxed">
          Not a security scanner, not an SEO tool, and not a substitute for talking to users. There is no model and no editorial desk. Scores are opinions produced by public rules.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="display text-3xl">Who</h2>
        <p className="mt-2 text-ink-2 leading-relaxed">
          Maintained by you, a community that wants a public answer to &quot;was this worth building?&quot;. Operated by API Blaze, LLC, a bunch of people who were bitter that years of craft was getting lost in all the slop.
        </p>
        <p className="mt-2 text-ink-2 leading-relaxed">
          Free to use, the code is MIT licensed, and the rules are a pull request away:{" "}
          <Link href="/contribute" className="underline">change them</Link>. Heuristics only, no LLMs, no paid data. The API is self-sustaining by design, so it runs on free tiers and modest hosting.
        </p>
        <p className="mt-2 text-ink-2 leading-relaxed">
          Questions: <a className="underline" href="mailto:support@isitslop.org">support@isitslop.org</a>. The founding brief is in{" "}
          <a className="underline" href="https://github.com/jayjaychicago/isitslop/blob/main/foundation.md">foundation.md</a>.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-2">
        <Link href="/methodology" className="btn">Read the rules</Link>
        <Link href="/contribute" className="btn btn-ghost">Change the rules</Link>
        <Link href="/api-docs" className="btn btn-ghost">API</Link>
      </div>
    </div>
  );
}
