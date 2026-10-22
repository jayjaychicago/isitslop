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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums [&>span]:whitespace-nowrap">
      {overall !== undefined && (
        <>
          <span title="Overall score: Popularity and Quality averaged, higher is better">
            <span className="text-muted mr-1">Overall</span>
            <span className={`font-bold ${scoreClass(overall)}`}>{overall ?? "?"}<span className="text-muted font-normal">/100</span></span>
          </span>
          <span className="text-line">·</span>
        </>
      )}
      <span title="Popularity: do the people who find it use it">
        <span className="text-muted mr-1">Popularity</span>
        <span className={`font-semibold ${scoreClass(popularity)}`}>{popularity ?? "?"}<span className="text-muted font-normal">/100</span></span>
      </span>
      <span className="text-line">·</span>
      <span title="Quality: real, maintained work by more than one person over time">
        <span className="text-muted mr-1">Quality</span>
        <span className={`font-semibold ${scoreClass(quality)}`}>{quality ?? "?"}<span className="text-muted font-normal">/100</span></span>
      </span>
    </div>
  );
}

/**
 * The verdict as two aligned columns, one per axis: the big word on top, its score lined up directly underneath.
 * Used on list rows so "Fringe" sits over "Popularity 0/100" and "Slop" over "Quality 0/100".
 */
export function VerdictColumns({ quality, popularity, align = "start", className = "" }: { quality: number | null | undefined; popularity: number | null | undefined; align?: "start" | "end"; className?: string }) {
  const cells = [
    { label: "Popularity", title: "Popularity: do the people who find it use it", value: popularity, word: popularityWord(popularity) },
    { label: "Quality", title: "Quality: real, maintained work by more than one person over time", value: quality, word: qualityWord(quality) },
  ];
  const side = align === "end" ? "lg:items-end lg:text-right" : "";
  return (
    <div className={`grid grid-cols-2 gap-x-5 sm:gap-x-8 ${className}`}>
      {cells.map((c) => (
        <div key={c.label} className={`flex flex-col items-start gap-2 min-w-0 ${side}`} title={c.title}>
          <div className={`display text-4xl sm:text-5xl lg:text-6xl leading-none flex items-center gap-2 whitespace-nowrap ${scoreClass(c.value)}`}>
            <WordIcon word={c.word} size="0.8em" className="shrink-0" />
            <span>{c.word}</span>
          </div>
          <div className="text-xs sm:text-sm tabular-nums whitespace-nowrap">
            <span className="text-muted">{c.label}</span>{" "}
            <span className={`font-semibold ${scoreClass(c.value)}`}>{c.value ?? "?"}</span>
            <span className="text-muted">/100</span>
          </div>
        </div>
      ))}
    </div>
  );
}
