import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPost, listPosts, postDate, renderPost } from "@/lib/blog";

export const dynamicParams = false;
export function generateStaticParams() { return listPosts().map((p) => ({ slug: p.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) return {};
  return { title: `${p.title} · Is it slop?`, description: p.description, openGraph: { title: p.title, description: p.description, type: "article", publishedTime: p.date, url: `https://isitslop.org/blog/${p.slug}` } };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/blog" className="text-sm text-muted hover:text-ink">← Blog</Link>
      <div className="mt-6 text-xs uppercase tracking-wider text-muted font-semibold">{postDate(p.date)} · {p.author}</div>
      <h1 className="display text-4xl sm:text-6xl leading-[1.02] mt-2">{p.title}</h1>
      {p.description && <p className="mt-4 text-lg text-ink-2 leading-relaxed">{p.description}</p>}
      <div className="prose-post mt-8" dangerouslySetInnerHTML={{ __html: renderPost(p) }} />
    </article>
  );
}
