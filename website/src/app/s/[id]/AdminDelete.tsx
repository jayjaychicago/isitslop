"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Entry } from "@/lib/api";
import { useSession } from "@/components/Session";

/** Operator only: remove the entry and every row attached to it. Shown when the signed-in GitHub login is in ADMIN_GITHUB_LOGINS. */
export function AdminDelete({ entry }: { entry: Entry }) {
  const { me } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!me?.user?.isAdmin) return null;
  const name = entry.url ? entry.url.replace(/^https?:\/\//, "") : entry.domain;

  async function remove() {
    if (!window.confirm(`Delete ${name} and all its data (grades, history, verifications, appeals, analytics connection)? This cannot be undone.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/entries/${entry.id}`, { method: "DELETE" });
      router.push("/?deleted=1");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function removeAnalytics() {
    if (!window.confirm(`Wipe Popularity for ${name}? The Google connection is revoked and removed, and the Popularity score and subscores are stripped from every grade. Quality stays. This cannot be undone.`)) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await api<{ revoked: boolean; gradesPurged: number }>(`/entries/${entry.id}/analytics/data`, { method: "DELETE" });
      setMsg(`Popularity wiped: connection removed${r.revoked ? " and revoked at Google" : ""}, ${r.gradesPurged} grade${r.gradesPurged === 1 ? "" : "s"} stripped.`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 card p-5 sm:p-6 border-slop/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="display text-2xl">Operator</h2>
          <p className="text-sm text-muted mt-1">Signed in as {me.user.githubLogin}. Wipe Popularity alone, or delete the entry and everything attached to it.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button className="btn btn-ghost border-slop/60 text-slop hover:opacity-90" onClick={removeAnalytics} disabled={busy}>
            {busy ? "Working…" : "Wipe Popularity"}
          </button>
          <button className="btn bg-slop text-white border-slop hover:opacity-90" onClick={remove} disabled={busy}>
            {busy ? "Working…" : "Delete all data for this entry"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-3 text-sm text-fresh">{msg}</p>}
      {err && <p className="mt-3 text-sm text-slop">{err}</p>}
    </section>
  );
}
