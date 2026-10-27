"use client";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { signInUrl } from "@/lib/api";
import { VerdictWords } from "@/components/Score";
import { ApiKeys } from "@/components/ApiKeys";

export default function MePage() {
  const { me } = useSession();
  if (!me) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  if (!me.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="display text-4xl">Your entries</h1>
        <p className="mt-3 text-ink-2">Sign in with GitHub to see what you own.</p>
        <a className="btn mt-5 inline-flex" href={signInUrl("/me")}>Sign in with GitHub</a>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-4xl">Your entries</h1>
      <p className="mt-2 text-ink-2">Signed in as {me.user.githubLogin}. <Link href="/claim" className="underline">Claim a URL or a repo</Link> to add it.</p>
      <ul className="card mt-6 divide-y divide-line">
        {me.entries.length === 0 && <li className="p-5 text-sm text-muted">Nothing yet.</li>}
        {me.entries.map((e) => (
          <li key={e.id}>
            <Link href={`/s/${e.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-4 hover:bg-paper">
              <div className="min-w-0">
                <div className="display text-3xl leading-tight truncate">{e.url ? e.url.replace(/^https?:\/\//, "") : "Private repository"}</div>
                {e.title && e.url && <div className="text-sm text-ink-2 truncate">{e.title}</div>}
              </div>
              <div className="display text-2xl shrink-0"><VerdictWords verdict={e.grade?.verdict} fallback={e.verified ? "Not graded yet" : "Unclaimed"} /></div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <h2 className="display text-3xl">API keys</h2>
        <p className="mt-2 text-ink-2">For the score API: <code>GET /v1/score?url=</code> with the key as <code>X-API-Key</code>. See the <Link href="/api-docs" className="underline">API page</Link>.</p>
        <div className="mt-4"><ApiKeys /></div>
      </section>
    </div>
  );
}
