// Writes public/brand/icons/<word>.svg from the paths in src/components/Icons.tsx. Run: node scripts/icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const src = readFileSync(new URL("../src/components/Icons.tsx", import.meta.url), "utf8");
const block = src.match(/ICON_PATHS[^{]*\{([\s\S]*?)\n\};/)[1];
mkdirSync(new URL("../public/brand/icons/", import.meta.url), { recursive: true });
for (const [, name, body] of block.matchAll(/^\s*(\w+):\s*`([^`]*)`/gm)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`;
  writeFileSync(new URL(`../public/brand/icons/${name}.svg`, import.meta.url), svg);
  console.log("wrote", name);
}
