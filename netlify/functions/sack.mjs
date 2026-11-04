// Netlify Function: every sack request comes through /api/sack.
import { getStore } from "@netlify/blobs";
import { handle } from "./core.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Not found", { status: 404 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
  const store = getStore({ name: "sack", consistency: "strong" });
  const env = {};
  for (const k of ["CLASS_PASSCODE", "CLASS_PASSCODE_02", "CLASS_PASSCODE_12", "ADMIN_PASSCODE"]) env[k] = Netlify.env.get(k);
  try {
    const r = await handle(body, store, env);
    return Response.json(r.body, { status: r.status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: "Something went wrong on the server. Try again." }, { status: 500 });
  }
};

export const config = { path: "/api/sack" };
