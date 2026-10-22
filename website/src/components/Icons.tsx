import type { SVGProps } from "react";

/**
 * One small glyph per verdict word. They are drawn in the same style as the brand mark
 * (round-capped strokes, a single accent dot) and inherit the text colour, so Slop is red,
 * Craft green, Fringe amber, Popular green wherever the word is.
 *
 * slop     a dripping splat
 * craft    a hammer
 * popular  a crowd
 * fringe   one figure alone in a dashed ring
 * unknown  the question mark from the brand mark
 *
 * Static copies live in public/brand/icons/ (generated from this file by scripts/icons.mjs).
 */
export const ICON_PATHS: Record<string, string> = {
  slop: `<path d="M3.5 9.5C3.5 5.5 7 3 12 3s8.5 2.5 8.5 6.5c0 2.2-1.3 2.9-1.3 5v1.7a1.4 1.4 0 0 1-2.8 0v-3c0-.6-.4-1-1-1s-1 .4-1 1v6.3a1.4 1.4 0 0 1-2.8 0v-4.3c0-.6-.4-1-1-1s-1 .4-1 1v1.8a1.4 1.4 0 0 1-2.8 0v-.5C6.8 12.6 3.5 12.5 3.5 9.5z" fill="currentColor" stroke="none"/>`,
  craft: `<path d="M8.5 6.5l4-4 7 7-4 4z"/><path d="M10.5 8.5l-8 8a1.4 1.4 0 0 0 0 2l1 1a1.4 1.4 0 0 0 2 0l8-8"/>`,
  popular: `<circle cx="12" cy="7" r="3"/><path d="M6 20v-1a6 6 0 0 1 12 0v1"/><circle cx="4.5" cy="10" r="2"/><path d="M1.5 20v-1a3 3 0 0 1 3-3"/><circle cx="19.5" cy="10" r="2"/><path d="M22.5 20v-1a3 3 0 0 0-3-3"/>`,
  fringe: `<circle cx="12" cy="12" r="10.5" stroke-dasharray="2 3"/><circle cx="12" cy="9" r="2.5"/><path d="M8 18v-1a4 4 0 0 1 8 0v1"/>`,
  unknown: `<path d="M8.5 9a3.5 3.5 0 1 1 5.2 3c-1.2.7-1.7 1.4-1.7 2.7v.3"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>`,
};

export type VerdictWord = "slop" | "craft" | "popular" | "fringe" | "unknown";

export function wordKey(word: string | null | undefined): VerdictWord {
  const w = (word ?? "").toLowerCase();
  return w === "slop" || w === "craft" || w === "popular" || w === "fringe" ? w : "unknown";
}

/** Inline icon for a verdict word. Sized with `1em` by default so it scales with the text next to it. */
export function WordIcon({ word, size = "1em", title, ...rest }: { word: string | null | undefined; size?: string | number; title?: string } & Omit<SVGProps<SVGSVGElement>, "width" | "height">) {
  const key = wordKey(word);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className="inline-block align-[-0.12em] shrink-0"
      {...rest}
    >
      {title && <title>{title}</title>}
      <g dangerouslySetInnerHTML={{ __html: ICON_PATHS[key] }} />
    </svg>
  );
}
