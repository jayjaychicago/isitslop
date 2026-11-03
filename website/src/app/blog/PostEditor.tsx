"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/Session";
import { api } from "@/lib/api";
import { renderMarkdown, type Post } from "@/lib/blog";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Operator only: the "New post" button on the blog index. */
export function NewPost() {
  const { me } = useSession();
  const router = useRouter();
  if (!me?.user?.isAdmin) return null;
  return <button className="btn text-sm" onClick={() => router.push(`/blog/new-post-${Date.now().toString(36)}`)}>New post</button>;
}

/**
 * Operator only: edit the post in place. Markdown in, with a live preview. Hyperlinks are plain Markdown,
 * [text](https://example.com); the toolbar inserts one. Everyone else sees nothing.
 */
export function PostEditor({ slug: initialSlug, initial }: { slug: string; initial: Post | null }) {
  const { me } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(!initial);
  const [post, setPost] = useState<Post | null>(initial);
  const [slug, setSlug] = useState(initialSlug);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState(initial?.draft ?? true);
  const [body, setBody] = useState(initial?.body ?? "");
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A draft is invisible to the public fetch that rendered the page; the operator's cookie can see it.
  useEffect(() => {
    if (initial || !me?.user?.isAdmin) return;
    api<{ post: Post }>(`/posts/${initialSlug}`).then(({ post: p }) => {
      setPost(p); setTitle(p.title); setDescription(p.description); setAuthor(p.author); setDate(p.date); setDraft(p.draft); setBody(p.body);
    }).catch(() => { /* genuinely new */ });
  }, [initial, initialSlug, me]);

  if (!me) return null;
  if (!me.user?.isAdmin) return initial ? null : <div className="mx-auto max-w-3xl px-4 py-16 text-muted">No such post.</div>;

  async function save(publish?: boolean) {
    setBusy(true); setMsg(null);
    const isDraft = publish === undefined ? draft : !publish;
    try {
      const r = await api<{ post: Post }>(`/posts/${slug}`, { method: "PUT", body: JSON.stringify({ title, description, author, date, draft: isDraft, body }) });
      if (slug !== initialSlug && post) await api(`/posts/${initialSlug}`, { method: "DELETE" }).catch(() => undefined);
      setPost(r.post); setDraft(r.post.draft);
      setMsg(r.post.draft ? "Saved as draft. Only you can see it." : "Published.");
      if (slug !== initialSlug) router.replace(`/blog/${slug}`);
      else router.refresh();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function remove() {
    if (!confirm("Delete this post?")) return;
    setBusy(true);
    try { await api(`/posts/${initialSlug}`, { method: "DELETE" }); router.push("/blog"); } catch (e) { setMsg((e as Error).message); setBusy(false); }
  }
  function insertLink() {
    const text = prompt("Link text", "APIblaze") ?? "";
    if (!text) return;
    const url = prompt("Link URL", "https://apiblaze.com") ?? "";
    if (!url) return;
    setBody((b) => `${b}${b && !b.endsWith(" ") && !b.endsWith("\n") ? " " : ""}[${text}](${url})`);
  }

  if (!open) {
    return (
      <div className="mt-10 flex items-center gap-3 text-sm">
        <button className="btn btn-ghost" onClick={() => setOpen(true)}>Edit post</button>
        {post?.draft && <span className="text-mixed">Draft: only you can see this page.</span>}
      </div>
    );
  }

  return (
    <section className={`${initial ? "mt-10" : "mx-auto max-w-3xl px-4 py-12"} flex flex-col gap-3 text-sm`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-3xl">{post ? "Edit post" : "New post"}</h2>
        {initial && <button className="text-muted hover:text-ink" onClick={() => setOpen(false)}>Close</button>}
      </div>
      <input className="input text-lg" placeholder="Title" value={title} onChange={(e) => { setTitle(e.target.value); if (!post) setSlug(slugify(e.target.value) || slug); }} />
      <input className="input" placeholder="One-line description, shown in the list and when shared" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="grid sm:grid-cols-3 gap-2">
        <input className="input" placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input font-mono text-xs" placeholder="url-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} title="The address: isitslop.org/blog/<slug>" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-ghost text-xs" onClick={insertLink}>+ Link</button>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => setBody((b) => `${b}\n\n## `)}>+ Heading</button>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => setBody((b) => `${b}**bold**`)}>+ Bold</button>
        <span className="text-muted text-xs">Markdown. A link is <code>[text](https://example.com)</code>, a heading starts with <code>##</code>, bold is <code>**like this**</code>.</span>
        <button type="button" className="ml-auto text-muted hover:text-ink text-xs" onClick={() => setPreview((p) => !p)}>{preview ? "Write" : "Preview"}</button>
      </div>
      {preview ? (
        <div className="card p-5 prose-post" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      ) : (
        <textarea className="input font-mono text-sm min-h-[28rem] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the post in Markdown." />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => save(true)} disabled={busy || !title.trim()}>{busy ? "Saving…" : draft ? "Publish" : "Save"}</button>
        <button className="btn btn-ghost" onClick={() => save(false)} disabled={busy || !title.trim()}>{draft ? "Save draft" : "Unpublish to draft"}</button>
        {post && <button className="btn btn-ghost text-slop" onClick={remove} disabled={busy}>Delete</button>}
        {msg && <span className={msg.startsWith("Saved") || msg === "Published." ? "text-fresh" : "text-slop"}>{msg}</span>}
      </div>
    </section>
  );
}
