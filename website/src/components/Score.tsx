import { scoreClass, verdictClass, verdictLabel } from "@/lib/api";

export function VerdictBadge({ verdict, size = "md" }: { verdict: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  const pad = size === "lg" ? "px-4 py-1.5 text-base" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return <span className={`inline-flex items-center rounded-full font-semibold ${pad} ${verdictClass(verdict)}`}>{verdictLabel(verdict)}</span>;
}

export function ScoreTile({ label, question, value, sub, big = false, onClick, open = false }: { label: string; question: string; value: number | null | undefined; sub?: string; big?: boolean; onClick?: () => void; open?: boolean }) {
  const num = value === null || value === undefined ? "?" : String(value);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`card p-5 sm:p-6 flex flex-col gap-2 text-left ${onClick ? "cursor-pointer hover:border-ink-2 transition-colors" : ""} ${open ? "border-ink" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">{label}</span>
        {onClick && <span className="text-xs text-muted">{open ? "hide details" : "click for details"}</span>}
      </div>
      <div className={`score-num ${big ? "text-7xl sm:text-8xl" : "text-5xl"} ${scoreClass(value)}`}>
        {num}
        {value !== null && value !== undefined && <span className="text-2xl text-muted ml-1">/100</span>}
      </div>
      <div className="text-sm text-ink-2">{question}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Tag>
  );
}

export function MiniScores({ quality, popularity }: { quality: number | null | undefined; popularity: number | null | undefined }) {
  return (
    <div className="flex items-center gap-3 text-sm tabular-nums whitespace-nowrap">
      <span title="Quality: real, maintained work by more than one person over time">
        <span className="text-muted mr-1">Quality</span>
        <span className={`font-semibold ${scoreClass(quality)}`}>{quality ?? "unknown"}</span>
      </span>
      <span className="text-line">·</span>
      <span title="Popularity: do the people who find it use it">
        <span className="text-muted mr-1">Popularity</span>
        <span className={`font-semibold ${scoreClass(popularity)}`}>{popularity ?? "unknown"}</span>
      </span>
    </div>
  );
}
