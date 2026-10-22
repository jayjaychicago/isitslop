"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, entryLabel, verdictClass, verdictLabel, type Entry, type GradeSummary } from "@/lib/api";
import { MiniScores } from "./Score";

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
        const r = await api<{ items: Item[] }>(`/entries?q=${encodeURIComponent(q)}&limit=${q ? 20 : 10}`);
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
      {!q && items.length > 0 && <div className="text-xs uppercase tracking-wider text-muted font-semibold -mb-2">Recently added</div>}
      <ul className="divide-y divide-line card">
        {items.length === 0 && (
          <li className="p-5 text-sm text-muted">{q ? "Nothing in the index matches. Paste the full URL to add it." : "The index is empty. Add the first URL."}</li>
        )}
        {items.map((it) => (
          <li key={it.id}>
            <Link href={`/s/${it.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 p-4 hover:bg-paper transition-colors">
              <div className="min-w-0">
                <div className="display text-3xl leading-tight truncate">{it.url ? it.url.replace(/^https?:\/\//, "") : "Private repository"}</div>
                {it.title && it.url && <div className="text-sm text-ink-2 truncate">{it.title}</div>}
              </div>
              <div className="shrink-0 flex flex-col sm:items-end gap-1">
                <div className={`display text-2xl leading-tight ${it.grade ? verdictClass(it.grade.verdict).split(" ")[0] : "text-muted"}`}>
                  {it.grade ? verdictLabel(it.grade.verdict) : it.verified ? "Not graded yet" : "Unclaimed"}
                </div>
                {it.grade && <MiniScores quality={it.grade.quality} popularity={it.grade.popularity} />}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
