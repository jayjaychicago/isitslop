/* eslint-disable react-hooks/set-state-in-effect -- results of the Google round trip are read from the URL fragment after mount */
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type EntryDetail, type Grade } from "@/lib/api";
import { ScoreTile, VerdictBadge, VerdictWords, popularityWord, qualityWord } from "@/components/Score";
import { SLOPPY_TITLE, sloppyClass } from "@/lib/api";
import { OwnerPanel } from "./OwnerPanel";
import { AdminDelete } from "./AdminDelete";

export function EntryView({ id }: { id: string }) {
  const [data, setData] = useState<EntryDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [gaPick, setGaPick] = useState<{ id: string; name: string }[] | null>(null);
  const [detail, setDetail] = useState<"quality" | "popularity" | null>(null);

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
      <h1 className="display text-5xl sm:text-7xl leading-[0.95] mt-1 break-words">
        {entry.url ? <a href={entry.url} target="_blank" rel="noreferrer nofollow">{entry.url.replace(/^https?:\/\//, "")}</a> : "Private repository"}
      </h1>
      <div className="mt-3 text-lg text-ink-2">
        {entry.title && entry.url && <span>{entry.title}</span>}
        {entry.repoUrl && (
          <span>{entry.title ? " · " : ""}code: <a href={entry.repoUrl} target="_blank" rel="noreferrer nofollow" className="underline break-all">{entry.repoUrl.replace(/^https?:\/\/github\.com\//, "")}</a></span>
        )}
        {entry.kind === "site" && entry.repoPrivate && <span className="text-muted">{entry.title ? " · " : ""}private repository linked</span>}
      </div>

      {flash && <div className="mt-4 card p-3 text-sm">{flash}</div>}

      <div className="card mt-8 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-line flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted font-semibold">Verdict</div>
            <div className="display text-4xl sm:text-6xl leading-[1.05] mt-1">
              <VerdictWords verdict={grade?.verdict} fallback={entry.verified ? "Not graded yet" : "Unclaimed"} />
            </div>
            {grade && <div className="text-sm text-muted mt-2">The two scores below, in words. The cut is 50 on each.</div>}
          </div>
          {grade && (
            <div className="sm:text-right shrink-0">
              <div className={`score-num text-6xl sm:text-7xl leading-none whitespace-nowrap ${sloppyClass(grade.sloppy)}`} title={SLOPPY_TITLE}>
                {grade.sloppy ?? "?"}<span className="text-[0.5em]">%</span>
              </div>
              <div className="text-xs uppercase tracking-wider text-muted font-semibold mt-1">sloppy</div>
              <div className="text-xs text-muted mt-1">{grade.sloppy === null ? "Unknown until both halves are connected" : "Popularity and Quality averaged, subtracted from 100."}</div>
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line">
          <ScoreTile
            label="Popularity"
            question="Do the people who find it actually use it? Read from Google Analytics."
            value={grade?.popularity ?? null}
            word={grade ? popularityWord(grade.popularity) : undefined}
            sub={grade ? grade.popularityInput?.note ?? "Google Analytics not connected: unknown." : "Not graded yet"}
            onClick={grade ? () => setDetail(detail === "popularity" ? null : "popularity") : undefined}
            open={detail === "popularity"}
          />
          <ScoreTile
            label="Quality"
            question="Is this real, maintained work by more than one person over time? Read from the repository."
            value={grade?.quality ?? null}
            word={grade ? qualityWord(grade.quality) : undefined}
            sub={grade ? grade.qualityBreakdown.note ?? `Read from ${grade.qualityBreakdown.repo}, rules v${grade.heuristicsVersion}` : "Not graded yet"}
            onClick={grade ? () => setDetail(detail === "quality" ? null : "quality") : undefined}
            open={detail === "quality"}
          />
        </div>
      </div>

      {grade && detail === "popularity" && <PopularityDetails grade={grade} />}
      {grade && detail === "quality" && <QualityDetails grade={grade} />}

      <OwnerPanel key={gaPick ? "pick" : "panel"} entry={entry} grade={grade} onChange={reload} gaPick={gaPick} onGaPicked={() => setGaPick(null)} initialTab={gaPick ? "analytics" : undefined} />

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
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr><th className="text-left py-1">Date</th><th className="text-right pl-4">Sloppy</th><th className="text-right pl-4">Popularity</th><th className="text-right pl-4">Quality</th><th className="text-right pl-4">Verdict</th><th className="text-right pl-4">Rules</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-line">
                    <td className="py-1.5">{new Date(h.createdAt).toLocaleString()}</td>
                    <td className={`text-right tabular-nums pl-4 font-semibold ${sloppyClass(h.sloppy)}`}>{h.sloppy === null ? "?" : `${h.sloppy}%`}</td>
                    <td className="text-right tabular-nums pl-4">{h.popularity ?? "?"}</td>
                    <td className="text-right tabular-nums pl-4">{h.quality ?? "?"}</td>
                    <td className="text-right pl-4"><VerdictBadge verdict={h.verdict} size="sm" /></td>
                    <td className="text-right text-muted pl-4">v{h.heuristicsVersion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AdminDelete entry={entry} />

      <p className="mt-12 text-xs text-muted">
        Scores are opinions produced by public rules, requested by the verified owner under the <Link href="/terms" className="underline">terms</Link>. See the <Link href="/methodology" className="underline">methodology</Link>.
      </p>
    </div>
  );
}

function QualityDetails({ grade }: { grade: Grade }) {
  const s = grade.qualityBreakdown.signals;
  return (
    <section className="mt-4">
      <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">Quality subscores</div>
      {s.length === 0 ? (
        <div className="card p-4 text-sm text-ink-2">{grade.qualityBreakdown.note ?? "No repository was read."}</div>
      ) : (
        <ul className="card divide-y divide-line">
          {s.map((sig) => {
            const pts = Math.round(sig.weight * sig.score);
            return (
              <li key={sig.id} className="p-4 grid sm:grid-cols-[8rem_1fr_6rem] gap-2 items-start">
                <div className="font-mono text-sm capitalize">{sig.id.replace(/_/g, " ")}</div>
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
                  {pts} <span className="text-muted font-normal">/ {sig.weight}</span>
                </div>
              </li>
            );
          })}
          <li className="p-3 text-xs text-muted flex flex-wrap justify-between gap-2">
            <span>Repository read: {grade.qualityBreakdown.repo}, rules v{grade.heuristicsVersion}.</span>
            <span>Think a rule misfired? <Link href="/contribute" className="underline">Change it for everyone</Link>, or appeal below.</span>
          </li>
        </ul>
      )}
    </section>
  );
}

function PopularityDetails({ grade }: { grade: Grade }) {
  const p = grade.popularityInput;
  if (!p || p.reach === undefined || p.returning === undefined) {
    return (
      <section className="mt-4">
        <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">Popularity subscores</div>
        <div className="card p-4 text-sm text-ink-2">{p?.note ?? "Google Analytics was not connected when this grade was computed."}</div>
      </section>
    );
  }
  // Mirrors api/src/heuristics/popularity.ts: popularity = reach × (0.5 + 0.5 × returning), both subscores out of 100.
  const reach = p.reach / 100;
  const ret = p.returning / 100;
  const rows: [string, string, string, string][] = [
    ["reach", "How many people at all: active users in the last 30 days on a log scale. 100 users is 0, 1,000 is 30, 10,000 is 60, 100,000 is 85, a million is 100. Reach multiplies everything: nobody there means zero, however loyal.", `${p.reach}/100`, `×${reach.toFixed(2)}`],
    ["returning", "People who came back: returning active users as a share of all active users, banded. 10% is 30, 25% is 60, 40% is 85, 60% is 100. Moves half of the reach-gated score.", `${p.returning}/100`, `×${(0.5 + 0.5 * ret).toFixed(2)}`],
  ];
  return (
    <section className="mt-4">
      <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">Popularity subscores</div>
      <ul className="card divide-y divide-line">
        {rows.map(([id, desc, ev, factor]) => (
          <li key={id} className="p-4 grid sm:grid-cols-[8rem_1fr_6rem] gap-2 items-start">
            <div className="font-mono text-sm capitalize">{id}</div>
            <div>
              <div className="text-sm text-ink-2">{desc}</div>
              <div className="mt-1"><span className="text-xs bg-paper border border-line rounded px-1.5 py-0.5">{ev}</span></div>
            </div>
            <div className="text-right tabular-nums font-semibold text-ink">{factor}</div>
          </li>
        ))}
        <li className="p-4 text-sm text-ink-2">100 × {reach.toFixed(2)} × {(0.5 + 0.5 * ret).toFixed(2)} = <strong className="text-ink">{Math.round(100 * reach * (0.5 + 0.5 * ret))}</strong></li>
        <li className="p-3 text-xs text-muted">Read from Google Analytics, last 30 days. The counts are scored and discarded: these two subscores are all that is kept. Bands live in <code>api/src/heuristics/popularity.ts</code>.</li>
      </ul>
    </section>
  );
}
