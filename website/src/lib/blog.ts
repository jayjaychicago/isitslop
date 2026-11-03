import { marked } from "marked";
import { API } from "@/lib/api";

/**
 * The blog: posts are rows in the API (written on the site by the operator), rendered here from Markdown.
 * Server-side reads carry no cookie, so they hit the API's edge cache; a save purges it.
 */
export type Post = { slug: string; title: string; description: string; author: string; date: string; draft: boolean; body: string; updatedAt: string };

export async function listPosts(): Promise<Post[]> {
  try {
    const r = await fetch(`${API}/posts`, { cache: "no-store" });
    if (!r.ok) return [];
    return ((await r.json()) as { items: Post[] }).items;
  } catch { return []; }
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    const r = await fetch(`${API}/posts/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!r.ok) return null;
    return ((await r.json()) as { post: Post }).post;
  } catch { return null; }
}

/** Markdown to HTML. Links are plain Markdown: [text](https://example.com). */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

export const postDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
