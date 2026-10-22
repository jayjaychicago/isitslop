# Is it slop? brand

- `mark.svg` / `mark.png` — the mark: ink rounded square, paper question mark, accent dot. Use at any size; 1024px PNG included.
- `mark-light.*` — paper square, ink question mark, for dark backgrounds.
- `logo.svg` / `logo.png` — horizontal lockup, ink on transparent.
- `logo-on-dark.*` — horizontal lockup, paper on transparent.
- `logo-paper.png`, `logo-ink.png` — horizontal lockup on a solid background.
- `logo-stacked-*.png` — mark above wordmark.
- `/og.png` — 1200x630 social card.

Colours: ink #17140f, paper #f7f3ec, accent #e3845f. Wordmark is Instrument Serif, "slop" in italic, converted to paths.

## Verdict icons (`icons/`)

One glyph per verdict word, 24×24, stroke `currentColor` so they take the colour of the word next to them. Generated from `src/components/Icons.tsx` with `node scripts/icons.mjs`.

- `slop.svg` — a dripping blob (filled).
- `craft.svg` — a hammer.
- `popular.svg` — a crowd.
- `fringe.svg` — one figure alone inside a dashed ring.
- `unknown.svg` — the question mark from the mark.
