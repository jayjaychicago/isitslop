/** DNS over HTTPS lookup of TXT records, via Cloudflare's public resolver. Free, no key. */
export async function lookupTxt(name: string): Promise<string[]> {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
    headers: { accept: 'application/dns-json' },
  });
  if (!r.ok) return [];
  const j = (await r.json()) as { Answer?: { type: number; data: string }[] };
  return (j.Answer ?? [])
    .filter((a) => a.type === 16)
    .map((a) => a.data.replace(/^"|"$/g, '').replace(/"\s*"/g, ''));
}
