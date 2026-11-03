/* eslint-disable react-hooks/set-state-in-effect -- comments are fetched once after mount */
"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, signInUrl } from "@/lib/api";
import { useSession } from "@/components/Session";

type Comment = { id: string; githubLogin: string; body: string; createdAt: string };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

/** Comments under a post. Anyone signed in with GitHub can leave one; the author or the operator can remove it. */
export function Comments({ slug }: { slug: string }) {
  const { me } = useSession();
  const path = usePathname();
  const [items, setItems] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setItems((await api<{ items: Comment[] }>(`/posts/${encodeURIComponent(slug)}/comments`)).items); } catch { setItems([]); }
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api<{ comment: Comment }>(`/posts/${encodeURIComponent(slug)}/comments`, { method: "POST", body: JSON.stringify({ body }) });
      setItems((xs) => [...(xs ?? []), r.comment]);
      setBody("");
    } catch (ex) { setErr((ex as Error).message); }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this comment?")) return;
    try {
      await api(`/posts/${encodeURIComponent(slug)}/comments/${id}`, { method: "DELETE" });
      setItems((xs) => (xs ?? []).filter((x) => x.id !== id));
    } catch (ex) { setErr((ex as Error).message); }
  }

  const user = me?.user;
  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="display text-3xl">Comments{items && items.length > 0 && <span className="text-muted text-xl ml-2">{items.length}</span>}</h2>
      {items === null ? (
        <div className="mt-4 text-sm text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">Nothing yet. Say what you think.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {items.map((x) => (
            <li key={x.id} className="card p-4">
              <div className="flex items-baseline gap-2 text-xs text-muted">
                <a className="font-semibold text-ink hover:underline" href={`https://github.com/${x.githubLogin}`} target="_blank" rel="noreferrer nofollow">{x.githubLogin}</a>
                <span>{when(x.createdAt)}</span>
                {user && (user.githubLogin === x.githubLogin || user.isAdmin) && (
                  <button className="ml-auto hover:text-slop" onClick={() => remove(x.id)}>remove</button>
                )}
              </div>
              <div className="mt-2 text-sm text-ink-2 whitespace-pre-wrap break-words">{x.body}</div>
            </li>
          ))}
        </ul>
      )}
      {!me ? null : !user ? (
        <div className="card mt-6 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <span className="text-ink-2">Sign in with GitHub to comment. Your login is shown next to what you write.</span>
          <a className="btn shrink-0" href={signInUrl(path || `/blog/${slug}`)}>Sign in with GitHub</a>
        </div>
      ) : (
        <form onSubmit={post} className="mt-6 flex flex-col gap-2">
          <textarea className="input min-h-28" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Plain text, up to 2000 characters. Shown as written, with your GitHub login." />
          {err && <div className="text-sm text-slop">{err}</div>}
          <div className="flex items-center gap-3">
            <button className="btn" type="submit" disabled={busy || !body.trim()}>{busy ? "Posting…" : "Post comment"}</button>
            <span className="text-xs text-muted">Commenting as {user.githubLogin}. You can remove your own comments.</span>
          </div>
        </form>
      )}
    </section>
  );
}
