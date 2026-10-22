# Is it slop? brand

- `mark.svg` / `mark.png` — the mark: ink rounded square, paper dog bowl heaped with slop, two fallen lumps in the accent colour. Use at any size; 1024px PNG included.
- `mark-light.*` — paper square, ink bowl, for dark backgrounds.
- `logo.svg` / `logo.png` — horizontal lockup, ink on transparent.
- `logo-on-dark.*` — horizontal lockup, paper on transparent.
- `logo-paper.png`, `logo-ink.png` — horizontal lockup on a solid background.
- `logo-stacked-*.png` — mark above wordmark.
- `/og.png` — 1200x630 social card.

Colours: ink #17140f, paper #f7f3ec, accent #e3845f. Wordmark is Instrument Serif, "slop" in italic, converted to paths. The bowl is the Slop verdict icon (see below); the SVGs are the source and the PNGs are rendered from them with ImageMagick.

## Verdict icons (`icons/`)

One glyph per verdict word, 24×24, filled with `currentColor` so they take the colour of the word next to them. Traced from `sheet.png` (the generated master sheet) into `src/components/Icons.tsx`; the SVG files are written from that file with `node scripts/icons.mjs`.

- `slop.svg` — a dog bowl heaped with dog food.
- `craft.svg` — a palette and paintbrush.
- `popular.svg` — three people raising the roof.
- `fringe.svg` — a tumbleweed.
- `unknown.svg` — the question mark from the mark.
