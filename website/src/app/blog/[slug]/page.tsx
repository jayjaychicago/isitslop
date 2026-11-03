import Link from "next/link";
import type { Metadata } from "next";
import { getPost, postDate, renderMarkdown } from "@/lib/blog";
import { PostEditor } from "../PostEditor";
import { Comments } from "../Comments";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return {};
  return { title: `${p.title} · Is it slop?`, description: p.description, openGraph: { title: p.title, description: p.description, type: "article", publishedTime: p.date, url: `https://isitslop.org/blog/${p.slug}` } };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPost(slug);
  // The operator can open a draft or a brand-new slug: the editor fetches with their cookie.
  if (!p) return <PostEditor slug={slug} initial={null} />;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/blog" className="text-sm text-muted hover:text-ink">← Blog</Link>
      <div className="mt-6 text-xs uppercase tracking-wider text-muted font-semibold">{postDate(p.date)}{p.author && <> · {p.author}</>}{p.draft && <span className="text-mixed ml-2">draft</span>}</div>
      <h1 className="display text-4xl sm:text-6xl leading-[1.02] mt-2">{p.title}</h1>
      {p.description && <p className="mt-4 text-lg text-ink-2 leading-relaxed">{p.description}</p>}
      <div className="prose-post mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      <PostEditor slug={slug} initial={p} />
      {!p.draft && <Comments slug={slug} />}
    </article>
  );
}
