// Sack logic, kept separate from Netlify so it can be tested with any store.
import SCORE from "./scoring.mjs";

export const SECTIONS = {
  "02": [1, 11, 2, 7, 15, 3, 6, 4, 8, 12, 5, 10, 14],
  "12": [1, 11, 16, 2, 7, 3, 6, 15, 4, 8, 12, 5, 10, 14],
};
const PLACE = /^[PBGMR][1-6]$/;

const recKey = (sec, id) => `rec/${sec}/${id}`;
const asgKey = (sec) => `assign/${sec}`;
const now = () => new Date().toISOString();

export function totals(place, answers) {
  let marks = 0, fama = 0, nefas = 0;
  answers.forEach((l, q) => {
    const c = SCORE[place][q].find((x) => x[0] === l);
    marks += c[1]; fama += c[2]; nefas += c[3];
  });
  return { collected: Math.max(0, marks), fama, nefas };
}

// What a student is allowed to see about their own record (no nefas).
function view(rec, place) {
  const out = { place, answers: rec ? rec.answers : [], turnedIn: rec ? rec.turnedIn : null };
  if (rec && rec.answers.length === 3) {
    const t = totals(place, rec.answers);
    out.collected = t.collected; out.fama = t.fama;
  }
  if (rec && rec.turnedIn != null) out.code = rec.code;
  return out;
}

const err = (msg, status = 400) => ({ status, body: { error: msg } });
const ok = (body) => ({ status: 200, body });

export async function handle(body, store, env) {
  const { action, sec } = body || {};
  if (action === "admin") return admin(body, store, env);

  if (!env.CLASS_PASSCODE) return err("The site isn’t set up yet: no class passcode.", 500);
  if ((body.pass || "").trim().toLowerCase() !== env.CLASS_PASSCODE.trim().toLowerCase())
    return err("That passcode isn’t right.", 401);
  if (!SECTIONS[sec]) return err("Choose your section.");

  if (action === "login") {
    const asg = (await store.get(asgKey(sec), { type: "json" })) || {};
    const status = {};
    for (const id of SECTIONS[sec]) {
      const r = await store.get(recKey(sec, id), { type: "json" });
      status[id] = asg[id] === "X" ? "refused" : r && r.turnedIn != null ? "done" : r && r.answers.length ? "started" : asg[id] ? "ready" : "waiting";
    }
    return ok({ status });
  }

  const id = Number(body.charId);
  if (!SECTIONS[sec].includes(id)) return err("Choose your character.");
  const asg = (await store.get(asgKey(sec), { type: "json" })) || {};
  const place = asg[id];
  if (!place) return ok({ waiting: true });
  if (place === "X") return ok({ refused: true });
  let rec = await store.get(recKey(sec, id), { type: "json" });

  if (action === "start") return ok(view(rec, place));

  if (action === "answer") {
    const q = Number(body.q), letter = String(body.letter || "");
    if (!rec) rec = { sec, id, place, answers: [], turnedIn: null, started: now(), log: [] };
    if (rec.place !== place) return err("Your place was changed. Ask your instructor to reset you.", 409);
    if (q !== rec.answers.length) return ok({ ...view(rec, place), note: "already answered" });
    if (q > 2 || !SCORE[place][q].some((c) => c[0] === letter)) return err("That isn’t one of the choices.");
    rec.answers.push(letter); rec.log.push([now(), `Q${q + 1} ${letter}`]); rec.updated = now();
    await store.setJSON(recKey(sec, id), rec);
    return ok(view(rec, place));
  }

  if (action === "turnin") {
    if (!rec || rec.answers.length < 3) return err("Answer all three questions first.");
    if (rec.turnedIn != null) return ok({ ...view(rec, place), note: "already turned in" });
    const n = Number(body.amount), t = totals(place, rec.answers);
    if (!Number.isInteger(n) || n < 0) return err("Enter a whole number of marks, 0 or more.");
    if (n > t.collected) return err(`You only collected ${t.collected} marks.`);
    rec.turnedIn = n;
    rec.code = `${String(id).padStart(2, "0")}${place}${rec.answers.join("")}-${n}`;
    rec.log.push([now(), `turned in ${n}`]); rec.updated = now();
    await store.setJSON(recKey(sec, id), rec);
    return ok(view(rec, place));
  }
  return err("Unknown request.");
}

async function admin(body, store, env) {
  if (!env.ADMIN_PASSCODE) return err("No instructor passcode is set.", 500);
  if ((body.pass || "") !== env.ADMIN_PASSCODE) return err("That instructor passcode isn’t right.", 401);
  const { op, sec } = body;
  if (!SECTIONS[sec]) return err("Unknown section.");

  if (op === "assign") {
    const clean = {};
    for (const [k, v] of Object.entries(body.assign || {})) {
      const id = Number(k);
      if (!SECTIONS[sec].includes(id)) continue;
      if (v === "X" || PLACE.test(v)) clean[id] = v;
    }
    await store.setJSON(asgKey(sec), clean);
  } else if (op === "reset") {
    await store.delete(recKey(sec, Number(body.charId)));
  } else if (op === "resetall") {
    for (const id of SECTIONS[sec]) await store.delete(recKey(sec, id));
  } else if (op !== "list") return err("Unknown instructor request.");

  const assign = (await store.get(asgKey(sec), { type: "json" })) || {};
  const recs = {};
  for (const id of SECTIONS[sec]) {
    const r = await store.get(recKey(sec, id), { type: "json" });
    if (r) recs[id] = { ...r, ...(r.answers.length === 3 ? totals(r.place, r.answers) : {}) };
  }
  return ok({ assign, recs });
}
