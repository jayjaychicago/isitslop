"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/Session";
import { signInUrl } from "@/lib/api";
import { ClaimRepo, VerifySite, domainOf } from "@/components/VerifySite";

const isRepo = (u: string) => /^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+/i.test(u.trim());
const looksLikeUrl = (u: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(u.trim());

/** The only way into the index: prove a URL or a repository is yours. */
export function ClaimView() {
  const params = useSearchParams();
  const router = useRouter();
  const { me, reload } = useSession();
  const [url, setUrl] = useState(params.get("url") ?? "");
  const [locked, setLocked] = useState(!!params.get("url"));
  const here = `/claim?url=${encodeURIComponent(url)}`;
  const ok = looksLikeUrl(url);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-4xl sm:text-5xl">Claim it</h1>
      <p className="mt-3 text-ink-2">Nothing is listed until its owner proves it is theirs. A repository is yours if your GitHub account can push to it. A site is yours after a DNS record, a well-known file, or an email to the domain.</p>

      <form className="mt-6 flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); if (ok) setLocked(true); }}>
        <input className="input w-full min-w-0" placeholder="example.com or github.com/owner/repo" value={url} onChange={(e) => { setUrl(e.target.value); setLocked(false); }} autoFocus={!locked} />
        {!locked && <button className="btn" type="submit" disabled={!ok}>Continue</button>}
      </form>

      {locked && ok && (
        <div className="card mt-6 p-5 sm:p-6">
          <div className="text-xs uppercase tracking-wider text-muted font-semibold">{isRepo(url) ? "GitHub repository" : "Website"}</div>
          <div className="display text-3xl mt-1 break-words">{isRepo(url) ? url.replace(/^https?:\/\/(www\.)?/, "") : domainOf(url)}</div>
          <div className="mt-5">
            {!me ? (
              <div className="text-sm text-muted">Loading…</div>
            ) : !me.user ? (
              <div className="flex flex-col gap-3 text-sm">
                <p className="text-ink-2">Sign in with GitHub first. Your account is the owner of record.</p>
                <a className="btn inline-flex self-start" href={signInUrl(here)}>Sign in with GitHub</a>
              </div>
            ) : isRepo(url) ? (
              <ClaimRepo url={url} onDone={async (e) => { await reload(); router.push(`/s/${e.id}`); }} />
            ) : (
              <VerifySite url={url} onDone={async (e) => { await reload(); router.push(`/s/${e.id}`); }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
