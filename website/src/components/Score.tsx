import { scoreClass, verdictClass, verdictLabel } from "@/lib/api";

const WORD_CLASS: Record<string, string> = { slop: "text-slop", craft: "text-fresh", fringe: "text-mixed", popular: "text-fresh" };

/** The verdict sentence with each axis word in its own colour: Slop red, Craft green, Fringe amber, Popular green. */
export function VerdictWords({ verdict, fallback = "Not graded yet", className = "" }: { verdict: string | null | undefined; fallback?: string; className?: string }) {
  if (!verdict) return <span className={`text-muted ${className}`}>{fallback}</span>;
  const words = verdictLabel(verdict).split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className={WORD_CLASS[w.toLowerCase()] ?? "text-muted"}>{w}{i < words.length - 1 ? " " : ""}</span>
      ))}
    </span>
  );
}

export function VerdictBadge({ verdict, size = "md" }: { verdict: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  const pad = size === "lg" ? "px-4 py-1.5 text-base" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return <span className={`inline-flex items-center rounded-full font-semibold ${pad} ${verdictClass(verdict)}`}>{verdictLabel(verdict)}</span>;
}

export function ScoreTile({ label, question, value, sub, word, onClick, open = false }: { label: string; question: string; value: number | null | undefined; sub?: string; word?: string; onClick?: () => void; open?: boolean }) {
  const num = value === null || value === undefined ? "?" : String(value);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`p-5 sm:p-6 flex flex-col gap-2 text-left rounded-xl ${onClick ? "cursor-pointer hover:bg-paper transition-colors" : ""} ${open ? "bg-paper" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">{label}</span>
        {onClick && <span className="text-xs text-muted">{open ? "hide subscores" : "subscores"}</span>}
      </div>
      <div className="flex items-end gap-4 flex-wrap">
        <div className={`score-num text-6xl sm:text-7xl ${scoreClass(value)}`}>
          {num}
          {value !== null && value !== undefined && <span className="text-xl text-muted ml-1">/100</span>}
        </div>
        {word && <div className={`display text-3xl sm:text-4xl pb-1 ${scoreClass(value)}`}>= {word}</div>}
      </div>
      <div className="text-sm text-ink-2">{question}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Tag>
  );
}

export const qualityWord = (n: number | null | undefined) => (n === null || n === undefined ? "Unknown" : n >= 50 ? "Craft" : "Slop");
export const popularityWord = (n: number | null | undefined) => (n === null || n === undefined ? "Unknown" : n >= 50 ? "Popular" : "Fringe");

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
