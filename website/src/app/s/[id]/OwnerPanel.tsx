"use client";
import { useState } from "react";
import Link from "next/link";
import { API, api, signInUrl, type Entry, type Grade } from "@/lib/api";
import { useSession } from "@/components/Session";
import { ClaimRepo, INSTALL_APP, VerifySite } from "@/components/VerifySite";

type Tab = "verify" | "grade" | "repo" | "analytics" | "appeal";

export function OwnerPanel({ entry, grade, onChange, gaPick, onGaPicked, initialTab }: { entry: Entry; grade: Grade | null; onChange: () => void; gaPick?: { id: string; name: string }[] | null; onGaPicked?: () => void; initialTab?: Tab }) {
  const { me } = useSession();
  const user = me?.user ?? null;
  const isOwner = !!user && entry.ownerUserId === user.id;
  const [tab, setTab] = useState<Tab>(initialTab ?? "grade");
  const here = `/s/${entry.id}`;

  if (!me) return null;

  if (!user) {
    return (
      <section className="mt-12 card p-5 sm:p-6">
        <h2 className="display text-3xl">Own this?</h2>
        <p className="text-sm text-ink-2 mt-1">Sign in with GitHub, prove it is yours, and ask for a grade. Only owners get graded.</p>
        <a className="btn mt-4 inline-flex" href={signInUrl(here)}>Sign in with GitHub</a>
      </section>
    );
  }

  if (!isOwner) {
    const claimHref = entry.url ? `/claim?url=${encodeURIComponent(entry.url)}` : "/claim";
    return (
      <section className="mt-12 card p-5 sm:p-6">
        <h2 className="display text-3xl">Own this?</h2>
        <p className="text-sm text-ink-2 mt-1">Someone else has claimed this entry. If it is actually yours, prove it and it becomes yours. Signed in as {user.githubLogin}.</p>
        <Link className="btn mt-4 inline-flex" href={claimHref}>Claim it</Link>
      </section>
    );
  }

  const tabs: Tab[] = ["grade", ...(entry.kind === "site" ? (["repo"] as Tab[]) : []), "analytics", "appeal", "verify"];
  return (
    <section className="mt-12 card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-3xl">Your entry</h2>
        <div className="flex flex-wrap gap-1 text-sm">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full capitalize ${tab === t ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}>{t === "verify" ? "re-verify" : t}</button>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted mt-1">You own this entry as {user.githubLogin}.</p>
      <div className="mt-5">
        {tab === "grade" && <RequestGrade entry={entry} user={user} onDone={onChange} />}
        {tab === "repo" && <LinkRepo entry={entry} onDone={onChange} />}
        {tab === "analytics" && <Analytics entry={entry} onDone={onChange} gaPick={gaPick ?? null} onPicked={onGaPicked} />}
        {tab === "appeal" && <Appeal entry={entry} grade={grade} onDone={onChange} />}
        {tab === "verify" && (entry.kind === "github" ? <ClaimRepo url={entry.url ?? ""} onDone={onChange} label="Re-verify with GitHub" /> : <VerifySite url={entry.url ?? entry.domain} onDone={onChange} />)}
      </div>
    </section>
  );
}

function RequestGrade({ entry, user, onDone }: { entry: Entry; user: { githubLogin: string }; onDone: () => void }) {
  const [accept, setAccept] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setMsg(null);
    try { await api(`/entries/${entry.id}/grade`, { method: "POST", body: JSON.stringify({ acceptTerms: accept }) }); setMsg("Graded."); onDone(); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  const repoOk = entry.kind === "github" || !!entry.repoUrl || entry.repoPrivate;
  return (
    <div className="flex flex-col gap-4 text-sm">
      <ul className="card p-3 bg-paper flex flex-col gap-1.5">
        <li className="text-fresh">✓ Signed in as {user.githubLogin}; the repository is read with your GitHub access</li>
        <li className={entry.analyticsConnected ? "text-fresh" : "text-slop"}>{entry.analyticsConnected ? "✓ Google Analytics connected" : "✗ Google Analytics not connected: Popularity will be unknown"}{!entry.analyticsConnected && <span className="text-muted ml-2">(analytics tab)</span>}</li>
        {entry.kind === "site" && (
          <li className={repoOk ? "text-fresh" : "text-slop"}>{repoOk ? "✓ Repository linked" : "✗ No repository linked: Quality will be unknown"}{!repoOk && <span className="text-muted ml-2">(repo tab)</span>}</li>
        )}
      </ul>
      <label className="flex items-start gap-2 card p-3 bg-paper">
        <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        <span>
          I own this and I am asking for a grade. I have read the <Link href="/terms" className="underline" target="_blank">terms</Link>. I understand the grade is an opinion produced by public rules, that it will be published, that I accept the outcome whatever it is, that my only recourse is the public appeal process, and that I waive any claim against the operator arising from the grade.
        </span>
      </label>
      <div className="flex items-center gap-3">
        <button className="btn" onClick={go} disabled={!accept || busy}>{busy ? "Grading…" : "Request grade"}</button>
        <span className="text-muted">At most 5 grades per entry per day.</span>
      </div>
      {msg && <div className={msg === "Graded." ? "text-fresh" : "text-slop"}>{msg}</div>}
    </div>
  );
}

function LinkRepo({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const [repo, setRepo] = useState(entry.repoUrl ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(unlink = false) {
    setBusy(true); setMsg(null);
    try {
      await api(`/entries/${entry.id}/repo`, { method: "POST", body: JSON.stringify({ repoUrl: unlink ? null : repo.trim() }) });
      setMsg(unlink ? "Repo unlinked." : "Repo linked. Request a grade.");
      onDone();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-ink-2">
        One thing, one entry. Link the repository this site is built from and Quality is read from it. It can be private: a private repository&apos;s URL is never
        published. Your GitHub account must have push access, and the Is It Slop app must be installed on the account that owns it.
      </p>
      {entry.repoPrivate && !entry.repoUrl && <div className="text-muted">A private repository is linked.</div>}
      <input className="input" placeholder="https://github.com/owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={() => go(false)} disabled={!repo.trim() || busy}>{busy ? "Linking…" : "Link repo"}</button>
        {(entry.repoUrl || entry.repoPrivate) && <button className="btn btn-ghost" onClick={() => go(true)} disabled={busy}>Unlink</button>}
        <a className="btn btn-ghost" href={INSTALL_APP}>Install the app</a>
      </div>
      {msg && <div className={msg.startsWith("Repo") ? "text-fresh" : "text-slop"}>{msg}</div>}
    </div>
  );
}

function Analytics({ entry, onDone, gaPick, onPicked }: { entry: Entry; onDone: () => void; gaPick: { id: string; name: string }[] | null; onPicked?: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  async function pick(g: { id: string; name: string }) {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ reading: { visitors: number; returning: number } }>(`/entries/${entry.id}/analytics`, { method: "POST", body: JSON.stringify({ propertyId: g.id, propertyName: g.name }) });
      setMsg(`Connected ${g.name}. Last 30 days: ${r.reading.visitors.toLocaleString()} active users, ${r.reading.returning.toLocaleString()} returning. Request a grade.`);
      setPicked(g.name);
      onDone();
      onPicked?.();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function disconnect() {
    setBusy(true); setMsg(null);
    try { await api(`/entries/${entry.id}/analytics`, { method: "DELETE" }); setMsg("Disconnected."); onDone(); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-ink-2">
        Popularity is read from your Google Analytics 4 property: active users in the last 30 days and how many of them came back. You sign in with
        Google and grant read-only access to Analytics; nothing is typed in and nothing is written. By connecting you agree that the two counts become your public Popularity score on this page. The connection is stored encrypted and removed when
        you disconnect or delete the entry. {entry.analyticsConnected ? "Currently connected." : "Nothing connected yet."}
      </p>
      {picked ? (
        <div className="text-ink-2">Connected: {picked}.</div>
      ) : gaPick && gaPick.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-ink-2">Pick the property for {entry.domain}:</span>
          {gaPick.map((g) => (
            <button key={g.id} className="btn btn-ghost justify-start" disabled={busy} onClick={() => pick(g)}>{g.name} <span className="text-muted ml-2">#{g.id}</span></button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <a className="btn" href={`${API}/google/login?entry=${entry.id}`}>{entry.analyticsConnected ? "Reconnect Google Analytics" : "Connect Google Analytics"}</a>
          {entry.analyticsConnected && <button className="btn btn-ghost" onClick={disconnect} disabled={busy}>Disconnect</button>}
        </div>
      )}
      <p className="text-xs text-muted">Other analytics products are an open contribution: see <code>api/src/lib/analytics.ts</code>.</p>
      {msg && <div className={msg.startsWith("Connected") || msg === "Disconnected." ? "text-fresh" : "text-slop"}>{msg}</div>}
    </div>
  );
}

function Appeal({ entry, grade, onDone }: { entry: Entry; grade: Grade | null; onDone: () => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setMsg(null);
    try {
      await api(`/entries/${entry.id}/appeals`, { method: "POST", body: JSON.stringify({ text }) });
      setMsg("Appeal filed. It is public and will be answered publicly.");
      setText("");
      onDone();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-ink-2">
        Appeals are public. The best appeal points at a specific rule that misfired on your repository or analytics. If you are right, the rule gets fixed for everyone and you get re-graded. Nobody gets a private exception.
      </p>
      <textarea className="input min-h-32" placeholder="Which rule misfired, and why?" value={text} onChange={(e) => setText(e.target.value)} />
      <div><button className="btn" onClick={go} disabled={!grade || text.trim().length < 20 || busy}>{busy ? "Filing…" : "File appeal"}</button></div>
      {!grade && <div className="text-muted">There is no grade to appeal yet.</div>}
      {msg && <div className={msg.startsWith("Appeal filed") ? "text-fresh" : "text-slop"}>{msg}</div>}
    </div>
  );
}
