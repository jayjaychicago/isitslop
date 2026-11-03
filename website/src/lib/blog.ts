import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

/**
 * The blog is Markdown files in website/content/blog, one per post, named <date>-<slug>.md with a small
 * front matter block (title, description, author, draft). No CMS, no account: a push publishes.
 */
export type Post = { slug: string; title: string; description: string; author: string; date: string; draft: boolean; body: string };

const DIR = path.join(process.cwd(), "content", "blog");

function parse(file: string): Post | null {
  const m = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/.exec(file);
  if (!m) return null;
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  const meta: Record<string, string> = {};
  if (fm) for (const line of fm[1].split("\n")) { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, ""); }
  return {
    slug: m[2],
    date: meta.date || m[1],
    title: meta.title || m[2].replace(/-/g, " "),
    description: meta.description || "",
    author: meta.author || "Is it slop?",
    draft: meta.draft === "true",
    body: fm ? raw.slice(fm[0].length) : raw,
  };
}

/** Published posts, newest first. Drafts are left out everywhere. */
export function listPosts(): Post[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).map(parse).filter((p): p is Post => !!p && !p.draft).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | null {
  return listPosts().find((p) => p.slug === slug) ?? null;
}

export function renderPost(p: Post): string {
  return marked.parse(p.body, { async: false }) as string;
}

export const postDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
