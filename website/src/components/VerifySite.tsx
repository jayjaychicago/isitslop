"use client";
import { useState } from "react";
import { api, type Entry } from "@/lib/api";

type StartResp = { verificationId: string; url: string; method: string; text: string; record?: { type: string; name: string; value: string }; file?: { url?: string; path?: string; content: string }; email?: string };

export const domainOf = (url: string) => {
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return url; }
};

/** Prove a site is yours: DNS TXT, well-known file, or an email to the domain. The entry is created when the check passes. */
export function VerifySite({ url, onDone }: { url: string; onDone: (entry: Entry) => void }) {
  const domain = domainOf(url);
  const methods = ["dns", "file", "email"] as const;
  const [method, setMethod] = useState<string>(methods[0]);
  const [email, setEmail] = useState(`admin@${domain}`);
  const [started, setStarted] = useState<StartResp | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true); setMsg(null);
    try { setStarted(await api<StartResp>(`/verify/start`, { method: "POST", body: JSON.stringify({ url, method, email }) })); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function check() {
    if (!started) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ verified: boolean; detail: string; entry?: Entry }>(`/verify/check`, { method: "POST", body: JSON.stringify({ verificationId: started.verificationId, code }) });
      setMsg(r.detail);
      if (r.verified && r.entry) onDone(r.entry);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap gap-2">
        {methods.map((m) => (
          <button key={m} type="button" onClick={() => { setMethod(m); setStarted(null); }} className={`btn btn-ghost text-sm ${method === m ? "border-ink" : ""}`}>
            {m === "dns" ? "DNS TXT record" : m === "file" ? "Well-known file" : "Email to the domain"}
          </button>
        ))}
      </div>
      {method === "email" && !started && (
        <label className="block">
          <span className="text-ink-2">Send the code to</span>
          <select className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)}>
            {["admin", "webmaster", "postmaster", "hostmaster"].map((l) => <option key={l}>{`${l}@${domain}`}</option>)}
          </select>
        </label>
      )}
      {!started ? (
        <div><button type="button" className="btn" onClick={start} disabled={busy}>{busy ? "Starting…" : "Start verification"}</button></div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-ink-2">{started.text}</p>
          {started.record && <pre>{`${started.record.type}  ${started.record.name}\n${started.record.value}`}</pre>}
          {started.file && <pre>{`${started.file.url ?? started.file.path}\n${started.file.content}`}</pre>}
          {method === "email" && <input className="input font-mono w-40" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />}
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={check} disabled={busy}>{busy ? "Checking…" : "Check now"}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setStarted(null)}>Start over</button>
          </div>
        </div>
      )}
      {msg && <div className="text-mixed">{msg}</div>}
    </div>
  );
}

export const INSTALL_APP = "https://github.com/apps/is-it-slop/installations/new";

/** Claim a repository with the signed-in GitHub account. The entry is created on success. */
export function ClaimRepo({ url, onDone, label = "Claim with GitHub" }: { url: string; onDone: (entry: Entry) => void; label?: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setMsg(null);
    try { const r = await api<{ entry: Entry }>(`/claim`, { method: "POST", body: JSON.stringify({ url }) }); onDone(r.entry); } catch (e) { setMsg((e as Error).message); setBusy(false); }
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-ink-2">Your GitHub account must have push access to this repository, and the Is It Slop app must be installed on the account that owns it. The repository can be private; its URL is never published.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={go} disabled={busy}>{busy ? "Checking…" : label}</button>
        <a className="btn btn-ghost" href={INSTALL_APP}>Install the app</a>
      </div>
      {msg && <div className="text-slop">{msg}</div>}
    </div>
  );
}
