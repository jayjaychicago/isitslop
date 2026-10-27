"use client";
import { ApiKeyWidget } from "apiblaze/react";
import { usePathname } from "next/navigation";
import { useSession } from "./Session";
import { signInUrl } from "@/lib/api";

/** Self-serve keys for the score API, in the site's colours. Signed-out visitors get the sign-in button instead. */
export function ApiKeys({ title = "Your API keys" }: { title?: string }) {
  const { me } = useSession();
  const path = usePathname();
  if (!me) return <div className="card p-5 text-sm text-muted">Loading…</div>;
  if (!me.user) {
    return (
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-ink-2">Sign in to create a key. Keys are tied to your GitHub account and can be revoked here any time.</span>
        <a className="btn shrink-0" href={signInUrl(path || "/")}>Sign in with GitHub</a>
      </div>
    );
  }
  return (
    <ApiKeyWidget
      endpoint="/api/apiblaze/keys"
      title={title}
      theme={{
        accent: "var(--ink)",
        accentText: "var(--paper)",
        surface: "var(--paper-2)",
        headerBackground: "var(--paper-2)",
        text: "var(--ink)",
        muted: "var(--muted)",
        border: "var(--line)",
        danger: "var(--slop)",
        success: "var(--fresh)",
        radius: "12px",
        fontFamily: "inherit",
      }}
    />
  );
}
