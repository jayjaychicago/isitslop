"use client";
import { useState } from "react";
import Link from "next/link";
import { api, type Entry, type Grade } from "@/lib/api";

type StartResp = { verificationId: string; method: string; text: string; record?: { type: string; name: string; value: string }; file?: { url?: string; path?: string; content: string }; email?: string };

export function OwnerPanel({ entry, grade, ownerKey, onOwnerKey, onChange }: { entry: Entry; grade: Grade | null; ownerKey: string | null; onOwnerKey: (k: string | null) => void; onChange: () => void }) {
  const [tab, setTab] = useState<"verify" | "grade" | "repo" | "appeal">(ownerKey ? "grade" : "verify");
  return (
    <section className="mt-12 card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-3xl">Owner actions</h2>
        <div className="flex gap-1 text-sm">
          {(["verify", "grade", ...(entry.kind === "site" ? (["repo"] as const) : []), "appeal"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full capitalize ${tab === t ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}>{t}</button>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted mt-1">
        {entry.verified ? "This entry has a verified owner." : "Nobody has verified ownership of this entry yet."}{" "}
        {ownerKey ? "Your owner key for this entry is stored in this browser." : "If you own it, verify to get an owner key."}
      </p>
      <div className="mt-5">
        {tab === "verify" && <Verify entry={entry} onKey={(k) => { onOwnerKey(k); onChange(); setTab("grade"); }} />}
        {tab === "grade" && <RequestGrade entry={entry} ownerKey={ownerKey} onKey={onOwnerKey} onDone={onChange} />}
        {tab === "repo" && <LinkRepo entry={entry} ownerKey={ownerKey} onKey={onOwnerKey} onDone={onChange} />}
        {tab === "appeal" && <Appeal entry={entry} grade={grade} ownerKey={ownerKey} onKey={onOwnerKey} onDone={onChange} />}
      </div>
    </section>
  );
}

function KeyField({ ownerKey, onKey }: { ownerKey: string | null; onKey: (k: string | null) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-2">Owner key</span>
      <input className="input mt-1 font-mono text-sm" placeholder="isk_…" value={ownerKey ?? ""} onChange={(e) => onKey(e.target.value || null)} />
    </label>
  );
}

function Verify({ entry, onKey }: { entry: Entry; onKey: (k: string) => void }) {
  const methods = entry.kind === "github" ? (["repo_file"] as const) : (["dns", "file", "email"] as const);
  const [method, setMethod] = useState<string>(methods[0]);
  const [email, setEmail] = useState(`admin@${entry.domain}`);
  const [started, setStarted] = useState<StartResp | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true); setMsg(null);
    try {
      setStarted(await api<StartResp>(`/entries/${entry.id}/verify/start`, { method: "POST", body: JSON.stringify({ method, email }) }));
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function check() {
    if (!started) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ verified: boolean; detail: string; ownerKey?: string }>(`/entries/${entry.id}/verify/check`, { method: "POST", body: JSON.stringify({ verificationId: started.verificationId, code }) });
      if (r.verified && r.ownerKey) { setKey(r.ownerKey); onKey(r.ownerKey); }
      setMsg(r.detail);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  if (key) {
    return (
      <div className="text-sm">
        <div className="text-fresh font-semibold">Verified. This is your owner key. It is shown once.</div>
        <pre className="mt-2 select-all">{key}</pre>
        <p className="text-muted mt-2">It is saved in this browser. Copy it somewhere safe if you want to use the API or another browser. Re-verifying issues a new key.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap gap-2">
        {methods.map((m) => (
          <button key={m} onClick={() => { setMethod(m); setStarted(null); }} className={`btn btn-ghost text-sm ${method === m ? "border-ink" : ""}`}>
            {m === "dns" ? "DNS TXT record" : m === "file" ? "Well-known file" : m === "email" ? "Email to the domain" : "File in repo"}
          </button>
        ))}
      </div>
      {method === "email" && !started && (
        <label className="block">
          <span className="text-ink-2">Send the code to</span>
          <select className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)}>
            {["admin", "webmaster", "postmaster", "hostmaster"].map((l) => <option key={l}>{`${l}@${entry.domain}`}</option>)}
          </select>
        </label>
      )}
      {!started ? (
        <div><button className="btn" onClick={start} disabled={busy}>{busy ? "Starting…" : "Start verification"}</button></div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-ink-2">{started.text}</p>
          {started.record && <pre>{`${started.record.type}  ${started.record.name}\n${started.record.value}`}</pre>}
          {started.file && <pre>{`${started.file.url ?? started.file.path}\n${started.file.content}`}</pre>}
          {method === "email" && <input className="input font-mono w-40" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />}
          <div className="flex gap-2">
            <button className="btn" onClick={check} disabled={busy}>{busy ? "Checking…" : "Check now"}</button>
            <button className="btn btn-ghost" onClick={() => setStarted(null)}>Start over</button>
          </div>
        </div>
      )}
      {msg && <div className={key ? "text-fresh" : "text-mixed"}>{msg}</div>}
    </div>
  );
}

function RequestGrade({ entry, ownerKey, onKey, onDone }: { entry: Entry; ownerKey: string | null; onKey: (k: string | null) => void; onDone: () => void }) {
  const [accept, setAccept] = useState(false);
  const [withPeople, setWithPeople] = useState(false);
  const [visitors, setVisitors] = useState("");
  const [activated, setActivated] = useState("");
  const [returned, setReturned] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setMsg(null);
    try {
      const people = withPeople ? { visitors: Number(visitors), activated: Number(activated), returned: Number(returned) } : undefined;
      await api(`/entries/${entry.id}/grade`, { method: "POST", ownerKey: ownerKey ?? undefined, body: JSON.stringify({ acceptTerms: accept, people }) });
      setMsg("Graded.");
      onDone();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <KeyField ownerKey={ownerKey} onKey={onKey} />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={withPeople} onChange={(e) => setWithPeople(e.target.checked)} />
        <span>Include usage numbers for the Usage score (last 30 days, self-reported, shown publicly)</span>
      </label>
      {withPeople && (
        <div className="grid sm:grid-cols-3 gap-3">
          <label>Visitors<input className="input mt-1" inputMode="numeric" value={visitors} onChange={(e) => setVisitors(e.target.value)} /></label>
          <label>Took the core action<input className="input mt-1" inputMode="numeric" value={activated} onChange={(e) => setActivated(e.target.value)} /></label>
          <label>Came back at least once<input className="input mt-1" inputMode="numeric" value={returned} onChange={(e) => setReturned(e.target.value)} /></label>
        </div>
      )}
      <label className="flex items-start gap-2 card p-3 bg-paper">
        <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        <span>
          I own this and I am asking for a grade. I have read the <Link href="/terms" className="underline" target="_blank">terms</Link>. I understand the grade is an opinion produced by public rules, that it will be published, that I accept the outcome whatever it is, that my only recourse is the public appeal process, and that I waive any claim against the operator arising from the grade.
        </span>
      </label>
      <div className="flex items-center gap-3">
        <button className="btn" onClick={go} disabled={!accept || !ownerKey || busy}>{busy ? "Grading…" : "Request grade"}</button>
        <span className="text-muted">At most 5 grades per entry per day.</span>
      </div>
      {msg && <div className={msg === "Graded." ? "text-fresh" : "text-slop"}>{msg}</div>}
    </div>
  );
}

function LinkRepo({ entry, ownerKey, onKey, onDone }: { entry: Entry; ownerKey: string | null; onKey: (k: string | null) => void; onDone: () => void }) {
  const [repo, setRepo] = useState(entry.repoUrl ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go(unlink = false) {
    setBusy(true); setMsg(null);
    try {
      await api(`/entries/${entry.id}/repo`, { method: "POST", ownerKey: ownerKey ?? undefined, body: JSON.stringify({ repoUrl: unlink ? null : repo.trim() }) });
      setMsg(unlink ? "Repo unlinked." : "Repo linked. Request a grade to include the README.");
      onDone();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-4 text-sm">
      <KeyField ownerKey={ownerKey} onKey={onKey} />
      <p className="text-ink-2">
        One thing, one entry. If this site has a public GitHub repo, link it here and the README is graded together with the landing page.
        To prove the repo is yours, commit a file named <code>.isitslop</code> to its root containing the line below, then link.
      </p>
      <pre className="select-all">{`isitslop-site=${entry.id}`}</pre>
      <input className="input" placeholder="https://github.com/owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn" onClick={() => go(false)} disabled={!ownerKey || !repo.trim() || busy}>{busy ? "Linking…" : "Link repo"}</button>
        {entry.repoUrl && <button className="btn btn-ghost" onClick={() => go(true)} disabled={!ownerKey || busy}>Unlink</button>}
      </div>
      {msg && <div className={msg.startsWith("Repo") ? "text-fresh" : "text-slop"}>{msg}</div>}
    </div>
  );
}

function Appeal({ entry, grade, ownerKey, onKey, onDone }: { entry: Entry; grade: Grade | null; ownerKey: string | null; onKey: (k: string | null) => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setMsg(null);
    try {
      await api(`/entries/${entry.id}/appeals`, { method: "POST", ownerKey: ownerKey ?? undefined, body: JSON.stringify({ text }) });
      setMsg("Appeal filed. It is public and will be answered publicly.");
      setText("");
      onDone();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-4 text-sm">
      <KeyField ownerKey={ownerKey} onKey={onKey} />
      <p className="text-ink-2">
        Appeals are public. The best appeal points at a specific rule that misfired on your page. If you are right, the rule gets fixed for everyone and you get re-graded. Nobody gets a private exception.
      </p>
      <textarea className="input min-h-32" placeholder="Which rule misfired, and why?" value={text} onChange={(e) => setText(e.target.value)} />
      <div><button className="btn" onClick={go} disabled={!grade || !ownerKey || text.trim().length < 20 || busy}>{busy ? "Filing…" : "File appeal"}</button></div>
      {!grade && <div className="text-muted">There is no grade to appeal yet.</div>}
      {msg && <div className={msg.startsWith("Appeal filed") ? "text-fresh" : "text-slop"}>{msg}</div>}
    </div>
  );
}
