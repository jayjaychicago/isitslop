import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="pt-12 pb-8 sm:pt-20 sm:pb-10">
        <h1 className="display text-5xl sm:text-7xl leading-[0.95] max-w-3xl">
          AI can build anything. <br />
          <em>Was it worth building?</em>
        </h1>
        <p className="mt-5 max-w-2xl text-lg sm:text-xl text-ink-2 leading-relaxed">
          A sloppiness score for anything built with AI (so everything).
          Read from the owner&apos;s analytics and repo by open rules the community can <Link href="/methodology" className="underline decoration-line hover:decoration-ink">read</Link> and <Link href="/contribute" className="underline decoration-line hover:decoration-ink">change</Link>.
        </p>
      </section>

      <section className="pb-12">
        <SearchBox />
      </section>

      <section className="pb-10 grid sm:grid-cols-3 gap-x-6 gap-y-4 text-ink-2">
        <div><span className="display text-2xl text-ink">1. Add it.</span> A URL or a GitHub repo, and prove it is yours.</div>
        <div><span className="display text-2xl text-ink">2. Connect.</span> GitHub for Quality, Google Analytics for Popularity. Read-only.</div>
        <div><span className="display text-2xl text-ink">3. Get graded.</span> Public rules, public result, public appeals.</div>
      </section>

      <section className="card p-6 sm:p-8 border-ink flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h2 className="display text-3xl sm:text-4xl leading-tight">The rules are a pull request away.</h2>
          <p className="mt-2 text-ink-2 max-w-xl">One public file. No model, no secret weighting. Fix a rule and it changes for everyone.</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Link href="/contribute" className="btn">Change the rules</Link>
          <a href="https://github.com/jayjaychicago/isitslop" className="btn btn-ghost">github.com/jayjaychicago/isitslop</a>
        </div>
      </section>
    </div>
  );
}
