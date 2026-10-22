/* eslint-disable react-hooks/set-state-in-effect -- the session is fetched once after mount */
"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api, me, signInUrl, type Me } from "@/lib/api";

const Ctx = createContext<{ me: Me | null; reload: () => Promise<void> }>({ me: null, reload: async () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Me | null>(null);
  const reload = useCallback(async () => {
    try { setState(await me()); } catch { setState({ user: null, entries: [] }); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return <Ctx.Provider value={{ me: state, reload }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);

export function SignIn() {
  const { me: s, reload } = useSession();
  const path = usePathname();
  if (!s) return null;
  if (!s.user) return <a className="btn btn-ghost text-sm" href={signInUrl(path || "/")}>Sign in with GitHub</a>;
  return (
    <span className="flex items-center gap-3 text-sm">
      <Link href="/me" className="hover:text-ink">{s.user.githubLogin}</Link>
      <button className="text-muted hover:text-ink" onClick={async () => { await api("/auth/logout", { method: "POST" }); await reload(); }}>Sign out</button>
    </span>
  );
}
