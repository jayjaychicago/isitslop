"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Entry, type GradeSummary } from "@/lib/api";
import { VerdictColumns, VerdictWords } from "./Score";
import { scoreClass } from "@/lib/api";

type Item = Entry & { grade: GradeSummary | null };

/** What the home page shows before anyone types: the two reference entries, always. */
const FEATURED = ["isitslop.org", "apiblaze.com"];

export function SearchBox({ initial = [] }: { initial?: Item[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        if (q.trim()) {
          const r = await api<{ items: Item[] }>(`/entries?q=${encodeURIComponent(q)}&limit=20`);
          setItems(r.items);
        } else {
          const found = await Promise.all(FEATURED.map((d) => api<{ items: Item[] }>(`/entries?q=${encodeURIComponent(d)}&limit=5`).then((r) => r.items.find((i) => i.domain === d)).catch(() => undefined)));
          setItems(found.filter((x): x is Item => !!x));
        }
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
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (looksLikeUrl) add();
        }}
      >
        <input
          className="input text-base w-full min-w-0"
          placeholder="Search the index, or paste a URL or github.com/owner/repo to add it"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1 sm:flex-none" type="button" onClick={() => setQ(q.trim())} title="Results appear as you type">
            Search
          </button>
          <button className="btn flex-1 sm:flex-none" type="submit" disabled={!looksLikeUrl || busy}>
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
      {err && <div className="text-sm text-slop">{err}</div>}

      <ul className="divide-y divide-line card">
        {items.length === 0 && (
          <li className="p-5 text-sm text-muted">{q ? "Nothing in the index matches. Paste the full URL to add it." : "Loading…"}</li>
        )}
        {items.map((it) => (
          <li key={it.id}>
            <Link href={`/s/${it.id}`} className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8 p-5 sm:p-6 hover:bg-paper transition-colors">
              <div className="flex items-center gap-4 sm:gap-6 min-w-0 lg:flex-1">
                {it.grade && (
                  <div className="shrink-0 text-center w-20 sm:w-28" title="Overall score: Popularity and Quality averaged, higher is better">
                    <div className={`score-num text-5xl sm:text-7xl lg:text-8xl leading-none ${scoreClass(it.grade.overall)}`}>{it.grade.overall ?? "?"}</div>
                    <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted font-semibold mt-1 whitespace-nowrap">Overall /100</div>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="display text-4xl sm:text-5xl lg:text-6xl leading-none break-words">{it.url ? it.url.replace(/^https?:\/\//, "") : "Private repository"}</div>
                  {it.title && it.url && <div className="mt-1.5 text-sm sm:text-base text-ink-2 truncate">{it.title}</div>}
                </div>
              </div>
              <div className="shrink-0 min-w-0">
                {it.grade ? (
                  <VerdictColumns quality={it.grade.quality} popularity={it.grade.popularity} align="end" />
                ) : (
                  <div className="display text-4xl sm:text-5xl lg:text-6xl leading-none">
                    <VerdictWords verdict={null} fallback={it.verified ? "Not graded yet" : "Unclaimed"} />
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
