"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Entry, type GradeSummary } from "@/lib/api";
import { MiniScores, VerdictBadge } from "./Score";

type Item = Entry & { grade: GradeSummary | null };

export function SearchBox({ initial = [] }: { initial?: Item[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await api<{ items: Item[] }>(`/entries?q=${encodeURIComponent(q)}&limit=20`);
        setItems(r.items);
        setErr(null);
      } catch (e) {
        setErr((e as Error).message);
      }
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);

  const looksLikeUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(q.trim());

  async function add() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ entry: Entry }>(`/entries`, { method: "POST", body: JSON.stringify({ url: q.trim() }) });
      router.push(`/s/${r.entry.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (looksLikeUrl) add();
        }}
      >
        <input
          className="input text-base"
          placeholder="Search the index, or paste a URL or github.com/owner/repo to add it"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <button className="btn" type="submit" disabled={!looksLikeUrl || busy}>
          {busy ? "Adding…" : "Add"}
        </button>
      </form>
      {err && <div className="text-sm text-slop">{err}</div>}
      <ul className="divide-y divide-line card">
        {items.length === 0 && (
          <li className="p-5 text-sm text-muted">{q ? "Nothing in the index matches. Paste the full URL to add it." : "The index is empty. Add the first URL."}</li>
        )}
        {items.map((it) => (
          <li key={it.id}>
            <Link href={`/s/${it.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-paper transition-colors">
              <div className="min-w-0">
                <div className="font-medium truncate">{it.title || it.domain}</div>
                <div className="text-xs text-muted truncate">{it.url.replace(/^https?:\/\//, "")}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {it.grade ? (
                  <>
                    <MiniScores critics={it.grade.critics} people={it.grade.people} />
                    <VerdictBadge verdict={it.grade.verdict} size="sm" />
                  </>
                ) : (
                  <span className="text-xs text-muted">{it.verified ? "verified, not graded" : "not verified"}</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
