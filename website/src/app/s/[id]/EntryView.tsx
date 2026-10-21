/* eslint-disable react-hooks/set-state-in-effect -- owner key is read from localStorage after mount */
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, loadOwnerKey, saveOwnerKey, type EntryDetail, type Grade } from "@/lib/api";
import { ScoreTile, VerdictBadge } from "@/components/Score";
import { OwnerPanel } from "./OwnerPanel";

export function EntryView({ id }: { id: string }) {
  const [data, setData] = useState<EntryDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);

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
    setOwnerKey(loadOwnerKey(id));
  }, [id, reload]);

  if (err) return <div className="mx-auto max-w-5xl px-4 py-16 text-slop">{err}</div>;
  if (!data) return <div className="mx-auto max-w-5xl px-4 py-16 text-muted">Loading…</div>;

  const { entry, grade, appeals, history } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted font-semibold">{entry.kind === "github" ? "GitHub repository" : "Website"}</div>
          <h1 className="display text-4xl sm:text-5xl leading-tight break-words">{entry.title || entry.domain}</h1>
          <a href={entry.url} target="_blank" rel="noreferrer nofollow" className="text-sm text-ink-2 underline break-all">
            {entry.url.replace(/^https?:\/\//, "")}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VerdictBadge verdict={grade?.verdict ?? "unrated"} size="lg" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        <ScoreTile
          label="Critics"
          question="Is there a quality product definition? What it is, why it must exist, who it is for."
          value={grade?.critics ?? null}
          sub={grade ? `Heuristics v${grade.heuristicsVersion}, confidence ${grade.criticsBreakdown.confidence}, ${grade.criticsBreakdown.words} words analysed` : "Not graded yet"}
          big
        />
        <ScoreTile
          label="People"
          question="Do the people who find it actually use it?"
          value={grade?.people ?? null}
          sub={grade?.peopleInput ? peopleSub(grade) : grade ? "Owner did not submit usage numbers" : "Not graded yet"}
          big
        />
      </div>

      {grade && <Breakdown grade={grade} />}

      <OwnerPanel entry={entry} grade={grade} ownerKey={ownerKey} onOwnerKey={(k) => { setOwnerKey(k); saveOwnerKey(id, k); }} onChange={reload} />

      <section className="mt-12">
        <h2 className="display text-3xl mb-3">Appeals</h2>
        {appeals.length === 0 ? (
          <p className="text-sm text-muted">No appeals. Owners can appeal a grade below; appeals and their outcomes are public.</p>
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
              <tr><th className="text-left py-1">Date</th><th className="text-right">Critics</th><th className="text-right">People</th><th className="text-right">Verdict</th><th className="text-right">Rules</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-line">
                  <td className="py-1.5">{new Date(h.createdAt).toLocaleString()}</td>
                  <td className="text-right tabular-nums">{h.critics}</td>
                  <td className="text-right tabular-nums">{h.people ?? "–"}</td>
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

function peopleSub(g: Grade): string {
  const p = g.peopleInput!;
  if (g.people === null) return `Self-reported: ${p.visitors} visitors. ${p.note}`;
  const pct = (n: number | null) => (n === null ? "–" : `${(n * 100).toFixed(1)}%`);
  return `Self-reported: ${p.visitors.toLocaleString()} visitors, ${pct(p.conversion)} converted, ${pct(p.returnRate)} returned. Not independently checked.`;
}

function Breakdown({ grade }: { grade: Grade }) {
  const [open, setOpen] = useState(false);
  const s = grade.criticsBreakdown.signals;
  return (
    <section className="mt-6">
      <button className="btn btn-ghost text-sm" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} how the Critics score was computed
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
                <div className={`text-right tabular-nums font-semibold ${sig.weight < 0 ? "text-slop" : "text-ink"}`}>
                  {sig.weight < 0 ? "" : "+"}{pts} <span className="text-muted font-normal">/ {sig.weight}</span>
                </div>
              </li>
            );
          })}
          {grade.criticsBreakdown.source && (
            <li className="p-3 text-xs text-muted">Source analysed: {grade.criticsBreakdown.source}</li>
          )}
        </ul>
      )}
    </section>
  );
}
