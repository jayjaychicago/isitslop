import { createApiblazeKeys } from "apiblaze/server";
import { API, type Me } from "@/lib/api";

/**
 * The self-serve key widget's server half. The browser talks only to this route; the control-plane
 * key never leaves the server. Who is asking is resolved the same way every page does: the
 * isitslop_session cookie, checked by the API's /me.
 */
const keys = createApiblazeKeys({
  cpKey: process.env.APIBLAZE_CP_KEY ?? "",
  getUser: async (req) => {
    const cookie = req.headers.get("cookie");
    if (!cookie) return null;
    const r = await fetch(`${API}/me`, { headers: { cookie }, cache: "no-store" });
    if (!r.ok) return null;
    const me = (await r.json()) as Me;
    if (!me.user) return null;
    // One tenant for everyone: keys are for the public score API, scoped to the person who minted them.
    return { tenant: "isitslop", userId: me.user.id, label: me.user.githubLogin };
  },
});

const unconfigured = () => Response.json({ error: "API keys are not enabled on this deployment" }, { status: 503 });

export const GET = (req: Request) => (process.env.APIBLAZE_CP_KEY ? keys.handler(req) : unconfigured());
export const POST = (req: Request) => (process.env.APIBLAZE_CP_KEY ? keys.handler(req) : unconfigured());
