import { scoreClass, verdictClass, verdictLabel } from "@/lib/api";
import { WordIcon } from "./Icons";

const WORD_CLASS: Record<string, string> = { slop: "text-slop", craft: "text-fresh", fringe: "text-mixed", popular: "text-fresh" };

/** The verdict sentence with each axis word in its own colour and icon: Slop red (drip), Craft green (hammer), Fringe amber (alone), Popular green (crowd). */
export function VerdictWords({ verdict, fallback = "Not graded yet", className = "" }: { verdict: string | null | undefined; fallback?: string; className?: string }) {
  if (!verdict) return <span className={`text-muted ${className}`}>{fallback}</span>;
  const words = verdictLabel(verdict).split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className={`whitespace-nowrap ${WORD_CLASS[w.toLowerCase()] ?? "text-muted"}`}>
          {WORD_CLASS[w.toLowerCase()] && <WordIcon word={w} size="0.8em" className="inline-block align-[-0.08em] shrink-0 mr-[0.18em]" />}
          {w}{i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

export function VerdictBadge({ verdict, size = "md" }: { verdict: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  const pad = size === "lg" ? "px-4 py-1.5 text-base" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  const words = verdict ? verdict.split("_") : [];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${pad} ${verdictClass(verdict)}`}>
      {words.map((w) => <WordIcon key={w} word={w} size="1em" />)}
      {verdictLabel(verdict)}
    </span>
  );
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
        {word && (
          <div className={`display text-3xl sm:text-4xl pb-1 flex items-center gap-2 ${scoreClass(value)}`}>
            <span>=</span>
            <WordIcon word={word} size="0.9em" />
            <span>{word}</span>
          </div>
        )}
      </div>
      <div className="text-sm text-ink-2">{question}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Tag>
  );
}

export const qualityWord = (n: number | null | undefined) => (n === null || n === undefined ? "Unknown" : n >= 50 ? "Craft" : "Slop");
export const popularityWord = (n: number | null | undefined) => (n === null || n === undefined ? "Unknown" : n >= 50 ? "Popular" : "Fringe");

export function MiniScores({ quality, popularity, overall }: { quality: number | null | undefined; popularity: number | null | undefined; overall?: number | null }) {
  return (
    <div className="flex items-center gap-3 text-sm tabular-nums whitespace-nowrap">
      {overall !== undefined && (
        <>
          <span title="Sloppiness score: Popularity and Quality averaged, higher is better">
            <span className="text-muted mr-1">Sloppiness</span>
            <span className={`font-bold ${scoreClass(overall)}`}>{overall ?? "?"}<span className="text-muted font-normal">/100</span></span>
          </span>
          <span className="text-line">·</span>
        </>
      )}
      <span title="Popularity: do the people who find it use it">
        <span className="text-muted mr-1">Popularity</span>
        <span className={`font-semibold ${scoreClass(popularity)}`}><WordIcon word={popularityWord(popularity)} size="1em" className="inline-block align-[-0.15em] mr-1" />{popularity ?? "?"}<span className="text-muted font-normal">/100</span></span>
      </span>
      <span className="text-line">·</span>
      <span title="Quality: real, maintained work by more than one person over time">
        <span className="text-muted mr-1">Quality</span>
        <span className={`font-semibold ${scoreClass(quality)}`}><WordIcon word={qualityWord(quality)} size="1em" className="inline-block align-[-0.15em] mr-1" />{quality ?? "?"}<span className="text-muted font-normal">/100</span></span>
      </span>
    </div>
  );
}
