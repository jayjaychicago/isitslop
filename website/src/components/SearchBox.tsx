"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Entry, type GradeSummary } from "@/lib/api";
import { VerdictColumns, VerdictWords } from "./Score";
import { SLOPPY_TITLE, sloppyClass } from "@/lib/api";

type Item = Entry & { grade: GradeSummary | null };

/** What the home page shows before anyone types: the two reference entries, always. */
const FEATURED = ["isitslop.org", "apiblaze.com"];

export function SearchBox({ initial = [] }: { initial?: Item[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>(initial);
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

  /** The only way in: prove it is yours. */
  const claim = () => router.push(`/claim?url=${encodeURIComponent(q.trim())}`);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (looksLikeUrl) claim();
        }}
      >
        <input
          className="input text-base w-full min-w-0"
          placeholder="Search the index, or paste your URL or github.com/owner/repo to claim it"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1 sm:flex-none" type="button" onClick={() => setQ(q.trim())} title="Results appear as you type">
            Search
          </button>
          <button className="btn flex-1 sm:flex-none" type="submit" disabled={!looksLikeUrl} title="Prove it is yours to list it">
            Claim
          </button>
        </div>
      </form>
      {err && <div className="text-sm text-slop">{err}</div>}

      <ul className="divide-y divide-line card">
        {items.length === 0 && (
          <li className="p-5 text-sm text-muted">{q ? "Nothing in the index matches. Yours? Paste the full URL and claim it." : "Loading…"}</li>
        )}
        {items.map((it) => (
          <li key={it.id}>
            <Link href={`/s/${it.id}`} className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 p-4 sm:p-6 hover:bg-paper transition-colors">
              {/* Phones: URL first, percent sloppy on its right. Desktop: percent sloppy left of the URL. */}
              <div className="flex items-start justify-between lg:justify-start lg:items-center gap-4 sm:gap-6 min-w-0 lg:flex-1">
                <div className="min-w-0 order-1 lg:order-2">
                  <div className="display text-3xl sm:text-5xl lg:text-6xl leading-none break-words">{it.url ? it.url.replace(/^https?:\/\//, "") : "Private repository"}</div>
                  {it.title && it.url && <div className="mt-1 sm:mt-1.5 text-sm sm:text-base text-ink-2 truncate">{it.title}</div>}
                </div>
                {it.grade && (
                  <div className="shrink-0 text-right lg:text-center lg:w-36 order-2 lg:order-1" title={SLOPPY_TITLE}>
                    <div className={`score-num text-5xl sm:text-7xl lg:text-8xl leading-none whitespace-nowrap ${sloppyClass(it.grade.sloppy)}`}>
                      {it.grade.sloppy ?? "?"}<span className="text-[0.5em]">%</span>
                    </div>
                    <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted font-semibold mt-1 whitespace-nowrap">sloppy</div>
                  </div>
                )}
              </div>
              <div className="shrink-0 min-w-0">
                {it.grade ? (
                  <VerdictColumns quality={it.grade.quality} popularity={it.grade.popularity} align="end" />
                ) : (
                  <div className="display text-3xl sm:text-5xl lg:text-6xl leading-none">
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
