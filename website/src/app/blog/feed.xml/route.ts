import { listPosts, renderMarkdown } from "@/lib/blog";

export const dynamic = "force-dynamic";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 for the blog. */
export async function GET() {
  const site = "https://isitslop.org";
  const items = (await listPosts()).map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${site}/blog/${p.slug}</link>
      <guid>${site}/blog/${p.slug}</guid>
      <pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
      <content:encoded><![CDATA[${renderMarkdown(p.body)}]]></content:encoded>
    </item>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Is it slop? Blog</title>
    <link>${site}/blog</link>
    <atom:link href="${site}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Notes from the people grading the slop, including their own.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}
