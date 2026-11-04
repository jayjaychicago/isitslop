"use client";
import { useCallback, useRef, useState } from "react";
import Script from "next/script";
import { api } from "@/lib/api";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** The support form. A Cloudflare Turnstile check stands in for a captcha; the message is emailed to the support inbox, whose address is not published. */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  const mount = useCallback(() => {
    if (!box.current || !window.turnstile || widget.current !== null) return;
    widget.current = window.turnstile.render(box.current, {
      sitekey: SITE_KEY,
      theme: "auto",
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending"); setErr(null);
    try {
      await api("/contact", { method: "POST", body: JSON.stringify({ name, email, message, token }) });
      setState("sent");
    } catch (ex) {
      setErr((ex as Error).message);
      setState("error");
      setToken("");
      if (widget.current !== null) window.turnstile?.reset(widget.current);
    }
  }

  if (!SITE_KEY) {
    return (
      <div className="card p-5 mt-8 text-sm text-ink-2">
        The form is not available right now. Use the <a className="underline" href="/feedback">feedback form</a> or open an issue on <a className="underline" href="https://github.com/jayjaychicago/isitslop/issues">GitHub</a>.
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="card p-5 mt-8">
        <div className="display text-2xl">Sent. Thank you.</div>
        <p className="text-sm text-ink-2 mt-1">We reply to {email}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 sm:p-6 mt-8 flex flex-col gap-4">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={mount} />
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Your name</span>
          <input className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Your email</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Message</span>
        <textarea className="input min-h-40" required minLength={5} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <div ref={box} />
      {err && <div className="text-sm text-slop">{err}</div>}
      <div className="flex items-center gap-3">
        <button className="btn" type="submit" disabled={state === "sending" || !token || message.trim().length < 5}>{state === "sending" ? "Sending…" : "Send"}</button>
        <span className="text-xs text-muted">{token ? "Goes to the people who run the site. Nothing is stored." : "Waiting for the human check."}</span>
      </div>
    </form>
  );
}
