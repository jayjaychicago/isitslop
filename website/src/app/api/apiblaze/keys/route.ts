import { createApiblazeKeys } from "apiblaze/server";
import { API, type Me } from "@/lib/api";

/**
 * The self-serve key widget's server half. The browser talks only to this route; the control-plane
 * key never leaves the server. Who is asking is resolved the same way every page does: the
 * isitslop_session cookie, checked by the API's /me.
 *
 * Built lazily on the first request: createApiblazeKeys throws without a key, and the build step
 * imports this module without one.
 */
let keys: ReturnType<typeof createApiblazeKeys> | null = null;

function handler(req: Request): Promise<Response> | Response {
  const cpKey = process.env.APIBLAZE_CP_KEY;
  if (!cpKey) return Response.json({ error: "API keys are not enabled on this deployment" }, { status: 503 });
  keys ??= createApiblazeKeys({
    cpKey,
    getUser: async (r) => {
      const cookie = r.headers.get("cookie");
      if (!cookie) return null;
      const res = await fetch(`${API}/me`, { headers: { cookie }, cache: "no-store" });
      if (!res.ok) return null;
      const me = (await res.json()) as Me;
      if (!me.user) return null;
      // One tenant for everyone: keys are for the public score API, scoped to the person who minted them.
      return { tenant: "isitslop", userId: me.user.id, label: me.user.githubLogin };
    },
  });
  return keys.handler(req);
}

export const GET = handler;
export const POST = handler;
