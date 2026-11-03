import Link from "next/link";
import type { Metadata } from "next";
import { listPosts, postDate } from "@/lib/blog";
import { NewPost } from "./PostEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog · Is it slop?", description: "Notes from the people grading the slop, including their own.", alternates: { types: { "application/rss+xml": "/blog/feed.xml" } } };

export default async function BlogIndex() {
  const posts = await listPosts();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-end justify-between gap-4">
        <h1 className="display text-5xl">Blog</h1>
        <div className="flex items-center gap-4">
          <NewPost />
          <a href="/blog/feed.xml" className="text-sm text-muted hover:text-ink">RSS</a>
        </div>
      </div>
      {posts.length === 0 && <p className="mt-6 text-muted">Nothing yet.</p>}
      <ul className="mt-8 flex flex-col divide-y divide-line">
        {posts.map((p) => (
          <li key={p.slug} className="py-6">
            <div className="text-xs uppercase tracking-wider text-muted font-semibold">{postDate(p.date)}</div>
            <Link href={`/blog/${p.slug}`} className="display text-3xl mt-1 block hover:underline">{p.title}</Link>
            {p.description && <p className="mt-2 text-ink-2 leading-relaxed">{p.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
