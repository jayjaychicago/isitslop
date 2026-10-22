import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="pt-14 pb-10 sm:pt-20 sm:pb-14">
        <h1 className="display text-5xl sm:text-7xl leading-[0.95] max-w-3xl">
          AI can build anything. <br />
          <em>Was this worth building?</em>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-2 leading-relaxed">
          A sloppiness score for things on the internet. It asks two plain questions. <strong className="text-ink">Quality</strong>: is this real,
          maintained work by more than one person over time? Read from the GitHub repo, using signals you cannot buy like stars. <strong className="text-ink">Popularity</strong>: do
          the people who find it actually use it? Read from the owner&apos;s Google Analytics: who visited, who came back. The verdict is two words, one per axis: Fringe or Popular, Slop or Craft. Nothing connected is unknown, not zero. Every rule is public.
        </p>
        <p className="mt-4 max-w-2xl text-ink-2 leading-relaxed">
          Maintained by people who want an honest, public answer to &quot;was this worth building?&quot;. It is not a security
          scanner, not an SEO tool, and not a substitute for talking to users. It is free, and the code is MIT licensed.
        </p>
      </section>

      <section className="pb-14">
        <SearchBox />
      </section>

      <section className="grid sm:grid-cols-3 gap-4 pb-6">
        <div className="card p-5">
          <div className="display text-2xl mb-1">1. Add it and prove it is yours</div>
          <p className="text-sm text-ink-2">Paste a URL or a GitHub repo. Sign in with GitHub. A site is yours after a DNS record, a well-known file, or an email to admin@ your domain; a repo is yours if your GitHub account can push to it.</p>
        </div>
        <div className="card p-5">
          <div className="display text-2xl mb-1">2. Connect GitHub and Google Analytics</div>
          <p className="text-sm text-ink-2">Quality is read from your repository, Popularity from your Google Analytics property. Both read-only, with your own login. Private repos work and are never named.</p>
        </div>
        <div className="card p-5">
          <div className="display text-2xl mb-1">3. Ask for a grade</div>
          <p className="text-sm text-ink-2">Only owners get graded. Accept the <Link href="/terms" className="underline">terms</Link>, we run the public rules, the result is published. You can appeal.</p>
        </div>
      </section>
      <section className="mt-10 card p-6 sm:p-8 border-ink">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <h2 className="display text-3xl sm:text-4xl leading-tight">The rules are a pull request away.</h2>
            <p className="mt-2 text-ink-2 max-w-xl">
              Every score on this site is computed by a handful of readable rules in one public file. No model, no secret weighting. If a rule is wrong,
              fix it and it changes for everyone. The rules are crude on purpose; smarter people are expected to show up.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href="/contribute" className="btn">Change the rules</Link>
            <a href="https://github.com/jayjaychicago/isitslop" className="btn btn-ghost">github.com/jayjaychicago/isitslop</a>
          </div>
        </div>
      </section>
      <p className="mt-6 text-sm text-muted pb-4">
        Read the <Link href="/methodology" className="underline">methodology</Link> to see exactly what the score is made of today.
      </p>
    </div>
  );
}
