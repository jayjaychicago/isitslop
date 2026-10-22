"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, entryLabel, verdictClass, verdictLabel, type EntryDetail, type Grade } from "@/lib/api";
import { ScoreTile, VerdictBadge } from "@/components/Score";
import { OwnerPanel } from "./OwnerPanel";

export function EntryView({ id }: { id: string }) {
  const [data, setData] = useState<EntryDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [gaPick, setGaPick] = useState<{ id: string; name: string }[] | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await api<EntryDetail>(`/entries/${id}`));
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    reload();
    // Returning from Google: the API puts the result in the URL fragment so it never hits server logs.
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const q = new URLSearchParams(window.location.search);
    if (h.get("google") === "ok") {
      setFlash(`Google Analytics connected: ${h.get("property")}. ${h.get("detail") ?? `Last 30 days: ${h.get("visitors")} active users, ${h.get("returning")} returning. Request a grade.`}`);
    } else if (h.get("google") === "pick") {
      try { setGaPick(JSON.parse(h.get("properties") ?? "[]")); } catch { /* ignore */ }
      setFlash("Google signed in. Pick the property in the analytics tab.");
    } else if (h.get("google") === "error") {
      setFlash(`Google: ${h.get("detail")}`);
    } else if (q.get("signin") === "denied") {
      setFlash("GitHub sign-in was cancelled.");
    } else if (q.get("signin") === "error") {
      setFlash("GitHub sign-in failed. Try again.");
    }
    if (window.location.hash || q.has("signin")) window.history.replaceState(null, "", window.location.pathname);
  }, [id, reload]);

  if (err) return <div className="mx-auto max-w-5xl px-4 py-16 text-slop">{err}</div>;
  if (!data) return <div className="mx-auto max-w-5xl px-4 py-16 text-muted">Loading…</div>;

  const { entry, grade, appeals, history } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="text-xs uppercase tracking-wider text-muted font-semibold">{entry.kind === "github" ? (entry.repoPrivate ? "Private repository" : "GitHub repository") : "Website"}</div>
      <h1 className={`display text-5xl sm:text-7xl leading-[0.95] mt-1 ${grade ? verdictClass(grade.verdict).split(" ")[0] : "text-muted"}`}>
        {grade ? `${verdictLabel(grade.verdict)}.` : entry.verified ? "Not graded yet." : "Unclaimed."}
      </h1>
      <div className="mt-4 text-lg">
        <span className="font-medium">{entryLabel(entry)}</span>
        {entry.url && (
          <>
            {" "}·{" "}
            <a href={entry.url} target="_blank" rel="noreferrer nofollow" className="text-ink-2 underline break-all">{entry.url.replace(/^https?:\/\//, "")}</a>
          </>
        )}
        {entry.repoUrl && (
          <span className="text-ink-2"> · code: <a href={entry.repoUrl} target="_blank" rel="noreferrer nofollow" className="underline break-all">{entry.repoUrl.replace(/^https?:\/\/github\.com\//, "")}</a></span>
        )}
        {entry.kind === "site" && entry.repoPrivate && <span className="text-muted"> · private repository linked</span>}
      </div>

      {flash && <div className="mt-4 card p-3 text-sm">{flash}</div>}

      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        <ScoreTile
          label="Quality"
          question="Is this real, maintained work by more than one person over time? Read from the repository."
          value={grade?.quality ?? null}
          sub={grade ? grade.qualityBreakdown.note ?? `Read from ${grade.qualityBreakdown.repo}, rules v${grade.heuristicsVersion}` : "Not graded yet"}
          big
        />
        <ScoreTile
          label="Popularity"
          question="Do the people who find it actually use it? Read from Google Analytics."
          value={grade?.popularity ?? null}
          sub={grade ? grade.popularityInput?.note ?? "Google Analytics not connected: unknown." : "Not graded yet"}
          big
        />
      </div>

      {grade && <Breakdown grade={grade} />}

      <OwnerPanel key={gaPick ? "pick" : "panel"} entry={entry} grade={grade} onChange={reload} gaPick={gaPick} initialTab={gaPick ? "analytics" : undefined} />

      <section className="mt-12">
        <h2 className="display text-3xl mb-3">Appeals</h2>
        {appeals.length === 0 ? (
          <p className="text-sm text-muted">No appeals. Owners can appeal a grade above; appeals and their outcomes are public.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {appeals.map((a) => (
              <li key={a.id} className="card p-4">
                <div className="flex items-center justify-between gap-3 text-xs text-muted">
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                  <span className={`font-semibold uppercase tracking-wider ${a.status === "accepted" ? "text-fresh" : a.status === "rejected" ? "text-slop" : "text-mixed"}`}>{a.status}</span>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{a.text}</p>
                {a.response && (
                  <div className="mt-3 border-l-2 border-line pl-3 text-sm text-ink-2">
                    <div className="text-xs text-muted mb-1">Maintainer response</div>
                    <p className="whitespace-pre-wrap">{a.response}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 1 && (
        <section className="mt-12">
          <h2 className="display text-3xl mb-3">History</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr><th className="text-left py-1">Date</th><th className="text-right">Quality</th><th className="text-right">Popularity</th><th className="text-right">Verdict</th><th className="text-right">Rules</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-line">
                  <td className="py-1.5">{new Date(h.createdAt).toLocaleString()}</td>
                  <td className="text-right tabular-nums">{h.quality ?? "?"}</td>
                  <td className="text-right tabular-nums">{h.popularity ?? "?"}</td>
                  <td className="text-right"><VerdictBadge verdict={h.verdict} size="sm" /></td>
                  <td className="text-right text-muted">v{h.heuristicsVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="mt-12 text-xs text-muted">
        Scores are opinions produced by public rules, requested by the verified owner under the <Link href="/terms" className="underline">terms</Link>. See the <Link href="/methodology" className="underline">methodology</Link>.
      </p>
    </div>
  );
}

function Breakdown({ grade }: { grade: Grade }) {
  const [open, setOpen] = useState(false);
  const s = grade.qualityBreakdown.signals;
  if (!s.length) return null;
  return (
    <section className="mt-6">
      <button className="btn btn-ghost text-sm" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} how the Quality score was computed
      </button>
      {open && (
        <ul className="card mt-3 divide-y divide-line">
          {s.map((sig) => {
            const pts = Math.round(sig.weight * sig.score);
            return (
              <li key={sig.id} className="p-4 grid sm:grid-cols-[8rem_1fr_5rem] gap-2 items-start">
                <div className="font-mono text-sm">{sig.id}</div>
                <div>
                  <div className="text-sm text-ink-2">{sig.description}</div>
                  {sig.evidence.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sig.evidence.map((e, i) => (
                        <span key={i} className="text-xs bg-paper border border-line rounded px-1.5 py-0.5 max-w-full truncate" title={e}>{e}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right tabular-nums font-semibold text-ink">
                  +{pts} <span className="text-muted font-normal">/ {sig.weight}</span>
                </div>
              </li>
            );
          })}
          {grade.qualityBreakdown.repo && (
            <li className="p-3 text-xs text-muted">Repository read: {grade.qualityBreakdown.repo}</li>
          )}
          <li className="p-3 text-xs text-muted">
            Think a rule misfired? Rules are public code. <Link href="/contribute" className="underline">Change them for everyone</Link>, or file an appeal below.
          </li>
        </ul>
      )}
    </section>
  );
}
