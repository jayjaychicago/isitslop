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
          A sloppiness score for things on the internet. It asks two plain questions. <strong className="text-ink">Definition</strong>: does the
          thing say clearly what it is, why it needs to exist, who it is for, and what it is not? <strong className="text-ink">Usage</strong>: do
          the people who find it actually use it? Both have to be good to be not slop. If either is bad, it is slop. Nobody using it counts as zero. Heuristics only, no LLMs, every rule public.
        </p>
        <p className="mt-4 max-w-2xl text-ink-2 leading-relaxed">
          Built for founders and open source maintainers who want an honest, public answer to &quot;was this worth building?&quot;, because AI made the
          &quot;what&quot; cheap and nobody was measuring the &quot;why&quot;. It is not a security scanner, not an SEO tool, and not a substitute for
          talking to users. It is free, and the code is MIT licensed.
        </p>
      </section>

      <section className="pb-14">
        <SearchBox />
      </section>

      <section className="grid sm:grid-cols-3 gap-4 pb-6">
        <div className="card p-5">
          <div className="display text-2xl mb-1">1. Add a URL</div>
          <p className="text-sm text-ink-2">Anyone can add a website or a public GitHub repo to the index. Adding does not grade it.</p>
        </div>
        <div className="card p-5">
          <div className="display text-2xl mb-1">2. Prove you own it</div>
          <p className="text-sm text-ink-2">DNS record, a well-known file, an email to admin@ your domain, or a file in your repo. You get an owner key.</p>
        </div>
        <div className="card p-5">
          <div className="display text-2xl mb-1">3. Ask for a grade</div>
          <p className="text-sm text-ink-2">Only owners get graded. You accept the <Link href="/terms" className="underline">terms</Link>, we run the rules, the result is public. You can appeal.</p>
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
