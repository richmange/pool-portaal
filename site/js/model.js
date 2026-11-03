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
// Regels: een speler speelt max. 2,5 wedstrijd (enkel = 1, koppel = 0,5); 3 potten (2 enkel + koppel) hooguit voor 1 speler;
// iedereen die aanwezig is speelt (tot 7 spelers, meer partijen zijn er niet) en de beurten worden zo eerlijk mogelijk verdeeld
// (verschil tussen meeste en minste beurten max. 1). Zo krijg je bij 3 spelers 2,5-2-1,5 en bij 4 spelers 2-1,5-1,5-1.
function bestLineup(D, A, B, P, T, presA, presB, maxLoad = 2.5) {
  const slots = D.meta.slots;
  let roster = (presA || []).filter((id) => P[id]);
  if (roster.length < 3) return null;
  const maxPlayers = slots.reduce((n, [, dbl]) => n + (dbl ? 2 : 1), 0);
  if (roster.length > maxPlayers) {
    const avg = (id) => [2, 3, 4, 5].reduce((a, d) => a + (P[id].eff[d] || 0), 0);
    roster = roster.sort((x, y) => avg(y) - avg(x)).slice(0, maxPlayers);
  }
  const opp = slots.map(([d, dbl]) => Object.entries(slotWeights(T, B, slotKey(d, dbl), presB)).map(([id, w]) => [P[id].eff[dbl ? 4 : d], w]));
  const single = (i, x) => opp[i].reduce((s, [r, w]) => s + w * elo(P[x].eff[slots[i][0]], r), 0);
  const double = (i, x, y) => elo((P[x].eff[4] + P[y].eff[4]) / 2, opp[i].reduce((s, [r, w]) => s + r * w, 0));
  const slotP = (i, x) => (slots[i][1] ? double(i, x[0], x[1]) : single(i, x));
  const sp = slots.map((_, i) => (slots[i][1] ? null : Object.fromEntries(roster.map((id) => [id, single(i, id)]))));
  const load = Object.fromEntries(roster.map((id) => [id, 0]));
  const cur = new Array(slots.length);
  const need = (i) => { let n = 0; for (let j = i; j < slots.length; j++) n += slots[j][1] ? 2 : 1; return n; };
  let best = null, bestS = -1;
  const check = () => {
    const v = Object.values(load);
    if (Math.max(...v) - Math.min(...v) > 1) return false;
    return v.filter((n) => n > 2).length <= 1;
  };
  const rec = (i) => {
    if (i === slots.length) {
      if (!check()) return;
      const ps = cur.map((x, k) => (slots[k][1] ? double(k, x[0], x[1]) : sp[k][x]));
      const o = outcome(convolve(ps)), sc = o.win + 0.5 * o.draw;
      if (sc > bestS) { bestS = sc; best = { assign: cur.slice(), probs: ps }; }
      return;
    }
    const idle = roster.filter((id) => load[id] === 0).length;
    if (idle > need(i)) return;
    if (!slots[i][1]) {
      for (const id of roster) {
        if (load[id] + 1 > maxLoad) continue;
        load[id] += 1; cur[i] = id; rec(i + 1); load[id] -= 1;
      }
    } else {
      for (let a = 0; a < roster.length; a++) for (let b = a + 1; b < roster.length; b++) {
        const x = roster[a], y = roster[b];
        load[x] += 0.5; load[y] += 0.5; cur[i] = [x, y]; rec(i + 1); load[x] -= 0.5; load[y] -= 0.5;
      }
    }
  };
  rec(0);
  if (!best) return null;
  const uses = {};
  best.assign.forEach((x) => (Array.isArray(x) ? x : [x]).forEach((id) => (uses[id] = (uses[id] || 0) + (Array.isArray(x) ? 0.5 : 1))));
  return { assign: best.assign, probs: best.probs, load: uses, cut: presA.length - roster.length, ...outcome(convolve(best.probs)) };
}
