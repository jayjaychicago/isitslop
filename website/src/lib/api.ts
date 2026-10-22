export const API = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.isitslop.org/v1").replace(/\/$/, "");

/** `${popularity}_${quality}`: fringe|popular|unknown _ slop|craft|unknown */
export type Verdict = string;

export type GradeSummary = { quality: number | null; popularity: number | null; overall: number | null; verdict: string; createdAt: string };

export type Entry = {
  id: string;
  url: string;
  kind: "site" | "github";
  domain: string;
  title: string | null;
  createdAt: string;
  verified: boolean;
  verifiedAt: string | null;
  repoUrl: string | null;
  githubLogin: string | null;
  analyticsProvider: string | null;
};

export type Signal = { id: string; description: string; weight: number; score: number; evidence: string[] };

export type Grade = {
  id: string;
  quality: number | null;
  popularity: number | null;
  overall: number | null;
  verdict: Verdict;
  qualityBreakdown: { score: number | null; signals: Signal[]; repo: string | null; version: string; note?: string };
  popularityInput: { provider?: string; visitors?: number; returning?: number; returningRate?: number; window?: string; note: string } | null;
  heuristicsVersion: string;
  createdAt: string;
};

export type Appeal = { id: string; gradeId: string | null; text: string; status: string; response: string | null; createdAt: string; resolvedAt: string | null };

export type EntryDetail = { entry: Entry; grade: Grade | null; history: (GradeSummary & { id: string; heuristicsVersion: string })[]; appeals: Appeal[] };

export async function api<T>(path: string, init?: RequestInit & { ownerKey?: string }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init?.headers as Record<string, string>) };
  if (init?.ownerKey) headers.authorization = `Bearer ${init.ownerKey}`;
  const r = await fetch(`${API}${path}`, { ...init, headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `request failed (${r.status})`);
  return j as T;
}

export function verdictLabel(v: string | null | undefined): string {
  if (!v || !v.includes("_")) return "Unrated";
  return v.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export function verdictClass(v: string | null | undefined): string {
  if (!v || v.includes("unknown")) return "text-unrated bg-unrated-bg";
  if (v === "popular_craft") return "text-fresh bg-fresh-bg";
  if (v === "fringe_slop") return "text-slop bg-slop-bg";
  return "text-mixed bg-mixed-bg";
}

export function scoreClass(n: number | null | undefined): string {
  if (n === null || n === undefined) return "text-unrated";
  if (n >= 50) return "text-fresh";
  return "text-slop";
}

export const OWNER_KEY_STORAGE = "isitslop.ownerKeys";

export function loadOwnerKey(entryId: string): string | null {
  try {
    const m = JSON.parse(localStorage.getItem(OWNER_KEY_STORAGE) ?? "{}");
    return m[entryId] ?? null;
  } catch {
    return null;
  }
}

export function saveOwnerKey(entryId: string, key: string | null) {
  try {
    const m = JSON.parse(localStorage.getItem(OWNER_KEY_STORAGE) ?? "{}");
    if (key) m[entryId] = key; else delete m[entryId];
    localStorage.setItem(OWNER_KEY_STORAGE, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}
