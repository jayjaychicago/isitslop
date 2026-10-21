/** Crude HTML and Markdown to text. No DOM, no deps. */

export type Extracted = {
  title: string;
  description: string;
  headings: string[];
  text: string;
  links: string[];
  words: number;
};

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function squash(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function extractHtml(html: string): Extracted {
  const title = squash(decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''));
  const description = squash(
    decode(
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ??
        html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] ??
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1] ??
        '',
    ),
  );
  const headings: string[] = [];
  for (const m of html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)) {
    const h = squash(decode(m[1].replace(/<[^>]+>/g, ' ')));
    if (h) headings.push(h);
  }
  const links: string[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) links.push(m[1].toLowerCase());

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const text = squash(decode(body));
  return { title, description, headings, text, links, words: countWords(text) };
}

export function extractMarkdown(md: string): Extracted {
  const headings: string[] = [];
  for (const m of md.matchAll(/^#{1,3}\s+(.+)$/gm)) headings.push(squash(m[1].replace(/[#*_`]/g, '')));
  const links: string[] = [];
  for (const m of md.matchAll(/\]\(([^)\s]+)\)/g)) links.push(m[1].toLowerCase());
  const text = squash(
    md
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[#>*_`|-]+/g, ' '),
  );
  const title = headings[0] ?? '';
  // first non-heading paragraph as description
  const firstPara = md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('![') && !p.startsWith('[!') && !p.startsWith('<'));
  const description = squash((firstPara ?? '').replace(/[#*_`>]/g, '')).slice(0, 300);
  return { title, description, headings, text, links, words: countWords(text) };
}

export function countWords(s: string): number {
  return s ? s.split(/\s+/).filter(Boolean).length : 0;
}
