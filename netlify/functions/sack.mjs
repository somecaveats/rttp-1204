// Netlify Function: every sack request comes through /api/sack.
import { getStore } from "@netlify/blobs";
import { handle } from "./core.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Not found", { status: 404 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
  const store = getStore({ name: "sack", consistency: "strong" });
  const env = { CLASS_PASSCODE: Netlify.env.get("CLASS_PASSCODE"), ADMIN_PASSCODE: Netlify.env.get("ADMIN_PASSCODE") };
  try {
    const r = await handle(body, store, env);
    return Response.json(r.body, { status: r.status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: "Something went wrong on the server. Try again." }, { status: 500 });
  }
};

export const config = { path: "/api/sack" };
