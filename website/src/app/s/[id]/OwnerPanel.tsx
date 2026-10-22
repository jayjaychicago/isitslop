"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API, api, type Entry, type Grade } from "@/lib/api";

type StartResp = { verificationId: string; method: string; text: string; record?: { type: string; name: string; value: string }; file?: { url?: string; path?: string; content: string }; email?: string };

export function OwnerPanel({ entry, grade, ownerKey, onOwnerKey, onChange }: { entry: Entry; grade: Grade | null; ownerKey: string | null; onOwnerKey: (k: string | null) => void; onChange: () => void }) {
  const [tab, setTab] = useState<"verify" | "grade" | "repo" | "analytics" | "appeal">(ownerKey ? "grade" : "verify");
  return (
    <section className="mt-12 card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-3xl">Owner actions</h2>
        <div className="flex gap-1 text-sm">
          {(["verify", "grade", ...(entry.kind === "site" ? (["repo"] as const) : []), "analytics", "appeal"] as const).map((t) => (
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
        {tab === "analytics" && <Analytics entry={entry} ownerKey={ownerKey} onKey={onOwnerKey} onDone={onChange} />}
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

function GitHubButton({ entry, ownerKey, label }: { entry: Entry; ownerKey: string | null; label: string }) {
  const href = `${API}/github/login?entry=${entry.id}${ownerKey ? `&ownerKey=${encodeURIComponent(ownerKey)}` : ""}`;
  return <a className="btn" href={href}>{label}</a>;
}

function Verify({ entry, onKey }: { entry: Entry; onKey: (k: string) => void }) {
  if (entry.kind === "github") {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-ink-2">
          Repositories are verified by signing in with a GitHub account that has push access. The isitslop GitHub App reads your repo with your own
          login: your rate limit, your private repos, nothing shared. If the app cannot see the repo yet, install it on that account first.
        </p>
        <div className="flex flex-wrap gap-2">
          <GitHubButton entry={entry} ownerKey={null} label="Sign in with GitHub" />
          <a className="btn btn-ghost" href="https://github.com/apps/is-it-slop/installations/new">Install the app</a>
        </div>
      </div>
    );
  }
  return <VerifySite entry={entry} onKey={onKey} />;
}

function VerifySite({ entry, onKey }: { entry: Entry; onKey: (k: string) => void }) {
  const methods = ["dns", "file", "email"] as const;
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
            {m === "dns" ? "DNS TXT record" : m === "file" ? "Well-known file" : "Email to the domain"}
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
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setMsg(null);
    try {
      await api(`/entries/${entry.id}/grade`, { method: "POST", ownerKey: ownerKey ?? undefined, body: JSON.stringify({ acceptTerms: accept }) });
      setMsg("Graded.");
      onDone();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <KeyField ownerKey={ownerKey} onKey={onKey} />
      {!entry.githubLogin && (
        <div className="card p-3 bg-paper flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-ink-2">Quality is read from GitHub with your own login. {entry.kind === "site" ? "Connect GitHub, then link your repo in the repo tab." : "Sign in with GitHub in the verify tab."}</span>
          {entry.kind === "site" && ownerKey && <GitHubButton entry={entry} ownerKey={ownerKey} label="Connect GitHub" />}
        </div>
      )}
      {!entry.analyticsProvider && (
        <div className="card p-3 bg-paper text-ink-2">Popularity is read from your analytics. Nothing connected means zero. Connect PostHog or Plausible in the analytics tab.</div>
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
      setMsg(unlink ? "Repo unlinked." : "Repo linked. Request a grade.");
      onDone();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-4 text-sm">
      <KeyField ownerKey={ownerKey} onKey={onKey} />
      <p className="text-ink-2">
        One thing, one entry. Link the repo this site is built from and Quality is read from it. The repo can be private. Your connected GitHub
        account must have push access to it, and the isitslop app must be installed on the account that owns it.
      </p>
      {entry.githubLogin ? (
        <div className="text-muted">Connected as {entry.githubLogin}.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <GitHubButton entry={entry} ownerKey={ownerKey} label="Connect GitHub" />
          <a className="btn btn-ghost" href="https://github.com/apps/is-it-slop/installations/new">Install the app</a>
        </div>
      )}
      <input className="input" placeholder="https://github.com/owner/repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn" onClick={() => go(false)} disabled={!ownerKey || !repo.trim() || busy || !entry.githubLogin}>{busy ? "Linking…" : "Link repo"}</button>
        {entry.repoUrl && <button className="btn btn-ghost" onClick={() => go(true)} disabled={!ownerKey || busy}>Unlink</button>}
      </div>
      {msg && <div className={msg.startsWith("Repo") ? "text-fresh" : "text-slop"}>{msg}</div>}
    </div>
  );
}

type Provider = { id: string; name: string; fields: { key: string; label: string; placeholder: string; required: boolean }[] };

function Analytics({ entry, ownerKey, onKey, onDone }: { entry: Entry; ownerKey: string | null; onKey: (k: string | null) => void; onDone: () => void }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState("posthog");
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ providers: Provider[] }>(`/analytics/providers`).then((r) => setProviders(r.providers)).catch(() => {});
  }, []);
  const p = providers.find((x) => x.id === provider);
  async function connect() {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ reading: { visitors: number; returning: number } }>(`/entries/${entry.id}/analytics`, { method: "POST", ownerKey: ownerKey ?? undefined, body: JSON.stringify({ provider, ...values }) });
      setMsg(`Connected. Last 30 days: ${r.reading.visitors.toLocaleString()} visitors, ${r.reading.returning.toLocaleString()} came back on another day. Request a grade.`);
      onDone();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function disconnect() {
    setBusy(true); setMsg(null);
    try { await api(`/entries/${entry.id}/analytics`, { method: "DELETE", ownerKey: ownerKey ?? undefined }); setMsg("Disconnected."); onDone(); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-4 text-sm">
      <KeyField ownerKey={ownerKey} onKey={onKey} />
      <p className="text-ink-2">
        Popularity is read from your analytics, never typed in: unique visitors in the last 30 days and how many of them came back on another day.
        The key is read-only, tested once, and stored encrypted. {entry.analyticsProvider ? `Currently connected: ${entry.analyticsProvider}.` : "Nothing connected yet."}
      </p>
      <div className="flex flex-wrap gap-2">
        {providers.map((x) => (
          <button key={x.id} onClick={() => { setProvider(x.id); setValues({}); }} className={`btn btn-ghost text-sm ${provider === x.id ? "border-ink" : ""}`}>{x.name}</button>
        ))}
      </div>
      {p && (
        <div className="grid sm:grid-cols-2 gap-3">
          {p.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-ink-2">{f.label}{f.required ? "" : " (optional)"}</span>
              <input className="input mt-1 font-mono text-sm" placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn" onClick={connect} disabled={!ownerKey || busy || !p}>{busy ? "Testing…" : "Connect and test"}</button>
        {entry.analyticsProvider && <button className="btn btn-ghost" onClick={disconnect} disabled={!ownerKey || busy}>Disconnect</button>}
      </div>
      <p className="text-xs text-muted">Google Analytics and others are an open contribution: one file in <code>api/src/lib/analytics.ts</code>.</p>
      {msg && <div className={msg.startsWith("Connected") || msg === "Disconnected." ? "text-fresh" : "text-slop"}>{msg}</div>}
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
