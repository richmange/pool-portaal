// Voorspelmodel in de browser. Spiegelt scraper/build.py (zelfde formules).
const elo = (ra, rb) => 1 / (1 + 10 ** ((rb - ra) / 400));
const slotKey = (d, dbl) => `${d}${dbl ? "d" : ""}`;

function convolve(ps) {
  let dist = [1];
  for (const p of ps) {
    const nd = new Array(dist.length + 1).fill(0);
    dist.forEach((v, k) => { nd[k] += v * (1 - p); nd[k + 1] += v * p; });
    dist = nd;
  }
  return dist;
}

function outcome(dist) {
  const win = dist.slice(4).reduce((a, b) => a + b, 0), draw = dist[3], loss = dist.slice(0, 3).reduce((a, b) => a + b, 0);
  return { win, draw, loss, ef: dist.reduce((a, v, k) => a + k * v, 0), dist };
}

// Opstelling-gewichten van een team voor een slot. Met `present` (lijst spelers-id's)
// tellen alleen de aanwezige spelers mee; de gewichten worden dan opnieuw genormaliseerd.
function slotWeights(T, team, key, present) {
  const base = T[team].w[key] ?? {};
  if (!present || !present.length) return base;
  const out = {};
  let sum = 0;
  for (const id of present) { const w = base[id] ?? 0.05; out[id] = w; sum += w; }
  for (const id of Object.keys(out)) out[id] /= sum || 1;
  return out;
}

// kans dat team A de partij wint bij "verwachte" opstelling (gewichten uit seizoensdata)
function expectedSlotProb(P, T, A, B, d, dbl, presA, presB) {
  const k = slotKey(d, dbl);
  const wa = slotWeights(T, A, k, presA), wb = slotWeights(T, B, k, presB);
  const eff = (id) => P[id].eff[dbl ? 4 : d];
  if (dbl) {
    const ra = Object.entries(wa).reduce((s, [id, w]) => s + w * eff(id), 0);
    const rb = Object.entries(wb).reduce((s, [id, w]) => s + w * eff(id), 0);
    return elo(ra, rb);
  }
  let s = 0;
  for (const [a, x] of Object.entries(wa)) for (const [b, y] of Object.entries(wb)) s += x * y * elo(eff(a), eff(b));
  return s;
}

function matchDist(D, A, B, P, T, presA, presB) {
  return convolve(D.meta.slots.map(([d, dbl]) => expectedSlotProb(P, T, A, B, d, dbl, presA, presB)));
}

// Beste opstelling voor A uit de aanwezige spelers `presA`, tegen de (aanwezige) spelers van B.
// Regel: een speler speelt max. 2,5 wedstrijd (enkel = 1, koppel = 0,5) => max. 3 potten, en 3 potten kan alleen met het koppel.
// Er zijn minstens 3 spelers nodig om 6 partijen (5 enkel + koppel) binnen die limiet te vullen.
function bestLineup(D, A, B, P, T, presA, presB, maxLoad = 2.5) {
  const slots = D.meta.slots;
  const roster = (presA || []).filter((id) => P[id]);
  if (roster.length < 3) return null;
  const opp = slots.map(([d, dbl]) => Object.entries(slotWeights(T, B, slotKey(d, dbl), presB)).map(([id, w]) => [P[id].eff[dbl ? 4 : d], w]));
  const slotP = (i, x) => {
    const [d, dbl] = slots[i];
    if (dbl) { const ra = (P[x[0]].eff[4] + P[x[1]].eff[4]) / 2; return elo(ra, opp[i].reduce((s, [r, w]) => s + r * w, 0)); }
    return opp[i].reduce((s, [r, w]) => s + w * elo(P[x].eff[d], r), 0);
  };
  const choices = (i) => {
    if (!slots[i][1]) return roster.slice();
    const out = [];
    for (let a = 0; a < roster.length; a++) for (let b = a + 1; b < roster.length; b++) out.push([roster[a], roster[b]]);
    return out;
  };
  const opts = slots.map((_, i) => choices(i));
  const uses = (assign) => { const c = {}; assign.forEach((x) => { const dbl = Array.isArray(x); (dbl ? x : [x]).forEach((id) => (c[id] = (c[id] || 0) + (dbl ? 0.5 : 1))); }); return c; };
  const valid = (assign) => Object.values(uses(assign)).every((n) => n <= maxLoad);
  const score = (assign) => { const o = outcome(convolve(assign.map((x, i) => slotP(i, x)))); return o.win + 0.5 * o.draw; };
  let best = null, bestS = -1, seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let r = 0; r < 80; r++) {
    let cur = null;
    for (let tries = 0; tries < 300 && !cur; tries++) { const c = opts.map((o) => o[Math.floor(rnd() * o.length)]); if (valid(c)) cur = c; }
    if (!cur) continue;
    let s = score(cur), improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < slots.length; i++) for (const c of opts[i]) {
        const t = cur.slice(); t[i] = c;
        if (!valid(t)) continue;
        const ts = score(t);
        if (ts > s + 1e-9) { cur = t; s = ts; improved = true; }
      }
    }
    if (s > bestS) { bestS = s; best = cur; }
  }
  if (!best) return null;
  const probs = best.map((x, i) => slotP(i, x));
  return { assign: best, probs, load: uses(best), ...outcome(convolve(probs)) };
}
