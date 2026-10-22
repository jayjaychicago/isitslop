"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setErr(null);
    try {
      await api("/feedback", { method: "POST", body: JSON.stringify({ message, email, website, page: typeof document !== "undefined" ? document.referrer || "" : "" }) });
      setState("sent");
    } catch (ex) {
      setErr((ex as Error).message);
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="card p-5 mt-8">
        <div className="display text-2xl">Sent. Thank you.</div>
        <p className="text-sm text-ink-2 mt-1">{email ? "We will reply to the address you gave." : "You did not leave an email, so we cannot reply, but it was read."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6 mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Message</span>
        <textarea className="input min-h-40" required minLength={5} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What happened, what you expected, which page." />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Your email <span className="text-muted font-normal">(optional, so we can reply)</span></span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </label>
      <label className="hidden" aria-hidden="true">
        Website <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      {err && <div className="text-sm text-slop">{err}</div>}
      <div className="flex items-center gap-3">
        <button className="btn" type="submit" disabled={state === "sending" || message.trim().length < 5}>{state === "sending" ? "Sending…" : "Send"}</button>
        <span className="text-xs text-muted">Five messages an hour per address. No tracking beyond the usual server log.</span>
      </div>
    </form>
  );
}
