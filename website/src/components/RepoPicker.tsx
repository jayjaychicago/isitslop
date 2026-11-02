"use client";
import { useEffect, useState } from "react";
import { api, type GithubRepos } from "@/lib/api";
import { installAppUrl } from "./VerifySite";

const norm = (u: string) => u.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\.git$/, "").replace(/\/+$/, "").toLowerCase();

/**
 * Pick a repository from the ones the signed-in person can push to and the app can see. Nothing to type:
 * if the repo is not in the list, the app is not installed on its account, and the only button is the install.
 * `value` is a github.com URL or owner/repo; `onChange` gets the repo's html URL.
 */
export function RepoPicker({ value, onChange, returnTo, wanted }: { value: string; onChange: (url: string) => void; returnTo: string; wanted?: string }) {
  const [data, setData] = useState<GithubRepos | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let alive = true;
    api<GithubRepos>("/github/repos").then((d) => { if (alive) setData(d); }).catch((e) => { if (alive) setErr((e as Error).message); });
    return () => { alive = false; };
  }, []);

  // The repo the person came for, if the app can see it, is selected before they touch anything.
  useEffect(() => {
    if (!data || value) return;
    const hit = wanted && data.repos.find((r) => r.fullName.toLowerCase() === norm(wanted));
    if (hit) onChange(hit.url);
  }, [data, wanted, value, onChange]);

  if (err) return <div className="text-slop">{err}</div>;
  if (!data) return <div className="text-muted">Reading your repositories from GitHub…</div>;

  const missing = wanted && !data.repos.some((r) => r.fullName.toLowerCase() === norm(wanted)) ? norm(wanted) : null;
  const accounts = [...new Set(data.repos.map((r) => r.account))];
  const f = filter.trim().toLowerCase();
  const shown = f ? data.repos.filter((r) => r.fullName.toLowerCase().includes(f)) : data.repos;

  if (data.repos.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-ink-2">
          {data.installations.length === 0
            ? "The Is It Slop app is not installed on any of your GitHub accounts yet. Install it, choose the repositories it may read, and you come straight back here."
            : "The app is installed, but none of the repositories it was given are ones you can push to. Add the repository to the installation and come back."}
        </p>
        <a className="btn self-start" href={installAppUrl(returnTo)}>Install the app on GitHub</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {missing && (
        <p className="text-mixed">
          The app cannot see <strong>{missing}</strong>: it is not installed on that account, or that repository was not included. Pick another below, or{" "}
          <a className="underline" href={installAppUrl(returnTo)}>add it on GitHub</a>.
        </p>
      )}
      {data.repos.length > 6 && <input className="input" placeholder="Filter repositories" value={filter} onChange={(e) => setFilter(e.target.value)} autoFocus />}
      <div className="card overflow-hidden max-h-80 overflow-y-auto" role="listbox" aria-label="Your repositories">
        {accounts.map((a) => {
          const rs = shown.filter((r) => r.account === a);
          if (!rs.length) return null;
          return (
            <div key={a}>
              {accounts.length > 1 && <div className="px-4 pt-3 pb-1 text-xs uppercase tracking-wider text-muted font-semibold">{a}</div>}
              {rs.map((r) => {
                const on = r.url === value;
                return (
                  <button
                    type="button"
                    key={r.fullName}
                    role="option"
                    aria-selected={on}
                    onClick={() => onChange(r.url)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 border-t border-line first:border-t-0 transition-colors ${on ? "bg-fresh-bg text-ink" : "hover:bg-paper text-ink-2"}`}
                  >
                    <span className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${on ? "border-fresh" : "border-line"}`}>{on && <span className="w-2 h-2 rounded-full bg-fresh" />}</span>
                    <span className="truncate">{r.fullName}</span>
                    {r.private && <span className="ml-auto text-xs text-muted shrink-0">private</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
        {shown.length === 0 && <div className="px-4 py-3 text-muted">Nothing matches.</div>}
      </div>
      <p className="text-xs text-muted">
        Repositories you can push to that the app can read, across {accounts.length === 1 ? `the ${accounts[0]} account` : `${accounts.length} accounts`}. Missing one?{" "}
        <a className="underline" href={installAppUrl(returnTo)}>Add it on GitHub</a>.
      </p>
    </div>
  );
}
