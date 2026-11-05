// Pool Portaal – statische single-page app (geen build-stap nodig).

const $app = document.getElementById("app");
let D;
const T = {}; // teams by id
const P = {}; // players by id
const DISCS = [2, 3, 4, 5];
const DN = { 1: "7-ball", 2: "8-ball", 3: "9-ball", 4: "10-ball", 5: "Straight pool" };

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (x, d = 0) => (x * 100).toFixed(d).replace(".", ",") + "%";
const pct1 = (x) => (x < 0.005 && x > 0 ? "<1%" : x > 0.995 && x < 1 ? ">99%" : pct(x));
const fmt = (x, d = 1) => Number(x).toFixed(d).replace(".", ",");
const sgn = (n) => (n > 0 ? "+" + n : String(n));
const dtf = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const dtl = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" });
const dt = (iso) => dtf.format(new Date(iso));
const myTeam = () => Number(localStorage.getItem("myTeam")) || D.meta.myTeam;
const tl = (id) => `<a href="#/team/${id}">${esc(T[id]?.name ?? id)}</a>`;
const pl = (id, name) => (P[id] ? `<a href="#/speler/${id}">${esc(P[id].name)}</a>` : esc(name ?? D.names[id] ?? id));
const plName = (x) => (typeof x === "number" ? P[x]?.name ?? D.names[x] : x);
const plLinks = (arr) => arr.map((x) => (typeof x === "number" ? pl(x) : esc(x))).join(" &amp; ");
const form = (f) => `<span class="form">${(f || []).slice(-5).map((c) => `<span class="chip ${c}">${c}</span>`).join("")}</span>`;
const cueUrl = (p) => `https://cuescore.com/player/${encodeURIComponent(p.name).replace(/%20/g, "+")}/${p.id}`;
const ratingUrl = (p) => `${D.meta.ratingUrl}?playerId=${p.id}`;

function probBar(o, labels = ["Winst", "Gelijk", "Verlies"]) {
  const seg = (c, v) => `<div class="${c}" style="flex:${Math.max(v, 0.0001)}" title="${pct(v)}">${v >= 0.08 ? pct(v) : ""}</div>`;
  return `<div class="bar">${seg("w", o.win)}${seg("d", o.draw)}${seg("l", o.loss)}</div>
  <div class="legend"><span>${labels[0]} ${pct(o.win)}</span><span>${labels[1]} ${pct(o.draw)}</span><span>${labels[2]} ${pct(o.loss)}</span></div>`;
}
const meter = (v, cls = "") => `<div class="meter ${cls}"><i style="width:${Math.max(0, Math.min(1, v)) * 100}%"></i></div>`;

function lineChart(points, { w = 640, h = 190, color = "var(--gold)" } = {}) {
  if (points.length < 2) return `<p class="empty">Nog te weinig data voor een grafiek.</p>`;
  const ys = points.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = Math.max(10, (hi - lo) * 0.12);
  lo -= pad; hi += pad;
  const X = (i) => 40 + (i / (points.length - 1)) * (w - 56);
  const Y = (v) => 12 + (1 - (v - lo) / (hi - lo)) * (h - 36);
  const path = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const grid = [0, 0.5, 1].map((f) => { const v = lo + f * (hi - lo); return `<line x1="40" x2="${w - 16}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="34" y="${Y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`; }).join("");
  const seps = points.map((p, i) => (i && p.group !== points[i - 1].group ? `<line x1="${X(i)}" x2="${X(i)}" y1="12" y2="${h - 24}" stroke="var(--mute)" stroke-dasharray="3 4"/><text x="${X(i) + 4}" y="22">${esc(p.group)}</text>` : "")).join("");
  const dots = points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.y)}" r="${points.length > 60 ? 1.6 : 3}" fill="${color}"><title>${esc(p.label)}: ${p.y}</title></circle>`).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Ratingverloop">${grid}${seps}<path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>${dots}
  <text x="40" y="${h - 6}">${esc(points[0].label)}</text><text x="${w - 16}" y="${h - 6}" text-anchor="end">${esc(points.at(-1).label)}</text></svg>`;
}
const spark = (vals, w = 90, h = 24) => {
  if (vals.length < 2) return "";
  const lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 2 - ((v - lo) / r) * (h - 4)}`).join(" ");
  const up = vals.at(-1) >= vals[0];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up ? "var(--win)" : "var(--loss)"}" stroke-width="1.8"/></svg>`;
};
const sortable = (root) => root.querySelectorAll("table.sortable").forEach((tb) => {
  tb.querySelectorAll("th[data-s]").forEach((th, _i) => th.addEventListener("click", () => {
    const idx = [...th.parentNode.children].indexOf(th);
    const dir = th.dataset.dir === "asc" ? "desc" : "asc";
    th.parentNode.querySelectorAll("th").forEach((x) => delete x.dataset.dir);
    th.dataset.dir = dir;
    const body = tb.tBodies[0];
    const rows = [...body.rows];
    const val = (r) => { const c = r.cells[idx]; const v = c.dataset.v ?? c.textContent; const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? String(v).toLowerCase() : n; };
    rows.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (dir === "asc" ? 1 : -1); });
    rows.forEach((r) => body.appendChild(r));
  }));
});

// ------------------------------------------------------------------ afgeleide data
function teamPlayers(tid) { return T[tid].players.map((id) => P[id]).filter(Boolean); }
function gamesOf(pid) {
  const out = [];
  for (const m of D.matches) for (const g of m.games) {
    const a = g.a.includes(pid), b = g.b.includes(pid);
    if (a || b) out.push({ m, g, side: a ? "a" : "b" });
  }
  return out;
}
const standings = () => [...D.teams].sort((a, b) => a.table.pos - b.table.pos);
const nextMatch = (tid) => D.matches.filter((m) => m.status !== "finished" && (m.home === tid || m.away === tid)).sort((a, b) => a.start.localeCompare(b.start))[0];
const lastMatch = (tid) => D.matches.filter((m) => m.status === "finished" && (m.home === tid || m.away === tid)).sort((a, b) => b.start.localeCompare(a.start))[0];
function predFor(m, tid) { // vanuit perspectief van tid
  const p = m.pred;
  return m.home === tid ? { win: p.win, draw: p.draw, loss: p.loss, ef: p.ef } : { win: p.loss, draw: p.draw, loss: p.win, ef: 6 - p.ef };
}
const pctDisc = (v) => (v && v[0] ? v[1] / v[0] : null);

function tipsHtml(kind, id) {
  const rows = D.tips[kind][id] || [];
  const out = [];
  const weak = rows.filter((r) => r.diff < -0.1).slice(0, 2);
  const strong = rows.filter((r) => r.diff > 0.1).slice(-2).reverse();
  for (const r of weak) out.push(`<div class="tip bad"><span class="ic">🎯</span><div><b>Verbeterpunt: ${DN[r.d]}</b><br><span class="mute">${pct(r.pct)} gewonnen over ${r.n} partijen${kind === "players" ? " – onder je eigen gemiddelde" : " – onder het 50%-gemiddelde"}. Extra trainen of de opstelling aanpassen.</span></div></div>`);
  for (const r of strong) out.push(`<div class="tip"><span class="ic">💪</span><div><b>Sterk punt: ${DN[r.d]}</b><br><span class="mute">${pct(r.pct)} gewonnen over ${r.n} partijen.</span></div></div>`);
  return out.join("") || `<p class="mute small">Nog te weinig partijen voor betrouwbare verbeterpunten.</p>`;
}


function meetings(A, B) {
  const ms = D.history.meetings.filter((m) => (m.home === A && m.away === B) || (m.home === B && m.away === A)).sort((x, y) => y.start.localeCompare(x.start));
  if (!ms.length) return `<p class="mute small">Nog geen eerdere ontmoetingen in de beschikbare seizoenen.</p>`;
  let w = 0, d = 0, l = 0, fa = 0, fb = 0;
  const rows = ms.map((m) => { const sa = m.home === A ? m.sa : m.sb, sb = m.home === A ? m.sb : m.sa; fa += sa; fb += sb; sa > sb ? w++ : sa < sb ? l++ : d++;
    return `<tr><td>${esc(m.s)}</td><td class="nowrap">${dtl.format(new Date(m.start))}</td><td>${m.home === A ? "thuis" : "uit"}</td><td class="n bold ${sa > sb ? "win" : sa < sb ? "lose" : ""}">${sa} – ${sb}</td></tr>`; }).join("");
  return `<p><span class="pill green">${w} W</span> <span class="pill">${d} G</span> <span class="pill red">${l} V</span> <span class="mute small">partijen ${fa}-${fb} (vanuit ${esc(T[A]?.name ?? A)})</span></p><table><thead><tr><th>Seizoen</th><th>Datum</th><th></th><th class="n">Uitslag</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function teamHistory(id) {
  const rows = D.history.teamHist[id] || [];
  if (!rows.length) return `<p class="mute small">Geen historie beschikbaar.</p>`;
  return `<table><thead><tr><th>Seizoen</th><th>Teamnaam</th><th class="n">Plaats</th><th class="n">Punten</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${esc(r.name)}</td><td class="n bold">${r.pos}e</td><td class="n">${r.pts}</td></tr>`).join("")}</tbody></table>`;
}

// ------------------------------------------------------------------ views
const views = {};

views.dashboard = () => {
  const tid = myTeam(), tm = T[tid], tb = tm.table;
  const nm = nextMatch(tid), lm = lastMatch(tid);
  const mvps = D.awards.mvp.slice(0, 5);
  let nextHtml = `<p class="mute">Geen openstaande wedstrijden.</p>`;
  if (nm) {
    const opp = nm.home === tid ? nm.away : nm.home, pr = predFor(nm, tid);
    nextHtml = `<div class="mute small">Speelronde ${nm.round} · ${dt(nm.start)} · ${esc(nm.venue)}</div>
    <h3 style="margin-top:6px">${nm.home === tid ? "Thuis tegen" : "Uit bij"} ${tl(opp)}</h3>
    ${probBar(pr)}<p class="small mute">Verwachte uitslag ${fmt(pr.ef)} – ${fmt(6 - pr.ef)} partijen · <a href="#/wedstrijd/${nm.id}">analyse &amp; opstelling →</a></p>`;
  }
  let lastHtml = `<p class="mute">Nog niet gespeeld.</p>`;
  if (lm) {
    const mine = lm.home === tid ? lm.sa : lm.sb, th = lm.home === tid ? lm.sb : lm.sa, opp = lm.home === tid ? lm.away : lm.home;
    lastHtml = `<div class="mute small">Ronde ${lm.round} · ${dt(lm.start)}</div><h3 style="margin-top:6px">${tl(tid)} <span class="${mine > th ? "win" : mine < th ? "lose" : ""}">${mine} – ${th}</span> ${tl(opp)}</h3><a href="#/wedstrijd/${lm.id}">Alle partijen →</a>`;
  }
  const fresh = [...Object.values(P)].filter((p) => p.season.matches >= 3).sort((a, b) => b.season.delta - a.season.delta)[0];
  const up = D.awards.upsets[0];
  const lead = standings()[0];
  return `
  <section class="hero">
    <div class="mute" style="color:#cfe8d8">Mijn team</div>
    <h1>${esc(tm.name)}</h1>
    <div class="sub">${esc(tm.venue)} · seizoen ${esc(D.meta.season)}</div>
    <div class="kpis">
      <div class="kpi"><b>${tb.pos}e</b><span>positie</span></div>
      <div class="kpi"><b>${tb.pts}</b><span>punten (${tb.played} gesp.)</span></div>
      <div class="kpi"><b>${tb.w}-${tb.d}-${tb.l}</b><span>W-G-V</span></div>
      <div class="kpi"><b>${pct1(tm.race.title)}</b><span>kans op titel</span></div>
      ${D.meta.relegation ? `<div class="kpi"><b>${pct1(tm.race.relegation)}</b><span>kans op degradatie</span></div>` : `<div class="kpi"><b>${pct1(tm.race.top3)}</b><span>kans top 3</span></div>`}
    </div>
    <div style="margin-top:12px">${form(tm.form)}</div>
  </section>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Volgende wedstrijd</h3>${nextHtml}</div>
    <div class="card"><h3>Laatste uitslag</h3>${lastHtml}</div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Stand <small><a href="#/stand">volledig →</a></small></h3>
      <table><tbody>${standings().map((t) => `<tr class="${t.id === tid ? "me" : ""}"><td class="n" style="width:26px">${t.table.pos}</td><td>${tl(t.id)}</td><td class="n">${t.table.played}</td><td class="n bold">${t.table.pts}</td></tr>`).join("")}</tbody></table></div>
    <div class="card"><h3>Uitgelicht</h3>
      <div class="tip"><span class="ic">👑</span><div><b>Koploper: ${tl(lead.id)}</b><br><span class="mute">${lead.table.pts} punten, ${pct1(lead.race.title)} kans op de titel.</span></div></div>
      ${mvps[0] ? `<div class="tip"><span class="ic">⭐</span><div><b>MVP: ${pl(mvps[0].id)}</b><br><span class="mute">${fmt(mvps[0].v)}% MVP-score (${esc(T[P[mvps[0].id].team]?.name)}).</span></div></div>` : ""}
      ${fresh ? `<div class="tip"><span class="ic">📈</span><div><b>Opkomend: ${pl(fresh.id)}</b><br><span class="mute">${sgn(fresh.season.delta)} rating dit seizoen (nu ${fresh.rating}).</span></div></div>` : ""}
      ${up ? `<div class="tip"><span class="ic">💥</span><div><b>Grootste stunt: ${pl(up.id)} won van ${pl(up.opp)}</b><br><span class="mute">${up.s}-${up.o}, tegen ${up.diff} ratingpunten sterkere tegenstander.</span></div></div>` : ""}
    </div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Verbeterpunten mijn team</h3>${tipsHtml("teams", tid)}</div>
    <div class="card"><h3>Top 5 MVP <small><a href="#/top10">alle lijsten →</a></small></h3>
      <ol class="top10">${mvps.map((r, i) => `<li><span class="rk">${i + 1}</span><span class="nm">${pl(r.id)} <span class="mute small">${esc(T[P[r.id].team]?.name)}</span></span><span class="vl">${fmt(r.v)}%</span></li>`).join("")}</ol></div>
  </div>`;
};

views.stand = () => {
  const tid = myTeam();
  return `<h1>Stand</h1><p class="mute">Punten = gewonnen partijen + 1 bonuspunt voor een gewonnen wedstrijd. Volgorde: punten, gewonnen partijen, gewonnen wedstrijden, onderling resultaat.</p>
  <div class="card tw"><table class="sortable"><thead><tr><th class="n" data-s>#</th><th data-s>Team</th><th class="n" data-s>Gesp</th><th class="n hide-s" data-s>W</th><th class="n hide-s" data-s>G</th><th class="n hide-s" data-s>V</th><th class="n" data-s>Partijen</th><th class="n" data-s>Pnt</th><th>Vorm</th><th class="n hide-s" data-s>Rating⌀</th><th class="n" data-s>Titel</th><th class="n" data-s>Top 3</th></tr></thead><tbody>
  ${standings().map((t) => { const b = t.table; return `<tr class="${t.id === tid ? "me" : ""}"><td class="n">${b.pos}</td><td>${tl(t.id)}</td><td class="n">${b.played}</td><td class="n hide-s">${b.w}</td><td class="n hide-s">${b.d}</td><td class="n hide-s">${b.l}</td><td class="n nowrap" data-v="${b.fw - b.fl}">${b.fw}-${b.fl}</td><td class="n bold">${b.pts}</td><td>${form(t.form)}</td><td class="n hide-s">${t.strength}</td><td class="n" data-v="${t.race.title}">${pct1(t.race.title)}</td><td class="n" data-v="${t.race.top3}">${pct1(t.race.top3)}</td></tr>`; }).join("")}
  </tbody></table></div>
  <p class="small mute" style="margin-top:10px">Titel/degradatie: ${D.meta.sims.toLocaleString("nl-NL")} simulaties van de resterende wedstrijden, inclusief onzekerheid over teamsterkte (kampioen = nr. 1 promoveert; geen degradatie). Zie <a href="#/titelrace">Titelrace</a>.</p>`;
};

views.programma = (arg) => {
  const tf = Number(arg) || 0, tid = myTeam();
  const rounds = {};
  for (const m of D.matches) if (!tf || m.home === tf || m.away === tf) (rounds[m.round] ||= []).push(m);
  const opts = `<option value="0">Alle teams</option>` + D.teams.map((t) => `<option value="${t.id}" ${t.id === tf ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  const html = Object.entries(rounds).map(([r, ms]) => `<div class="card" style="margin-bottom:12px"><h3>Speelronde ${r}</h3>${ms.sort((a, b) => a.start.localeCompare(b.start)).map((m) => matchRow(m, tid)).join("")}</div>`).join("");
  return `<h1>Programma &amp; uitslagen</h1><div class="sel"><label>Filter op team<select id="pf">${opts}</select></label></div>${html}`;
};
function matchRow(m, tid) {
  const fin = m.status === "finished";
  const mine = m.home === tid || m.away === tid;
  const pr = m.pred;
  const sc = fin ? `${m.sa} – ${m.sb}` : `<span class="small mute">${pct(pr.win)} · ${pct(pr.draw)} · ${pct(pr.loss)}</span>`;
  return `<a href="#/wedstrijd/${m.id}" style="color:inherit;text-decoration:none"><div class="match ${mine ? "me" : ""}"><div class="t a ${fin && m.sa > m.sb ? "bold" : ""}">${esc(T[m.home].name)}</div><div class="sc">${sc}</div><div class="t ${fin && m.sb > m.sa ? "bold" : ""}">${esc(T[m.away].name)}</div>
  <div class="meta"><span>${dt(m.start)}</span><span>${esc(m.venue)}</span><span>#${m.no}</span></div></div></a>`;
}

views.wedstrijd = (id) => {
  const m = D.matches.find((x) => x.id === Number(id));
  if (!m) return `<p class="empty">Wedstrijd niet gevonden.</p>`;
  const fin = m.status === "finished", pr = m.pred;
  const dist = pr.dist.map((v, k) => `<tr><td>${k} – ${6 - k}</td><td style="width:60%">${meter(v, k > 3 ? "" : k === 3 ? "gold" : "red")}</td><td class="n">${pct(v)}</td></tr>`).join("");
  const games = m.games.map((g) => `<div class="game"><div class="dc">${g.dbl ? "Dubbel " : ""}${DN[g.d] ?? g.d}<br>race ${g.r}</div><div class="${g.sa > g.sb ? "bold" : ""} right">${plLinks(g.a)}</div><div class="sc">${g.sa} – ${g.sb}</div><div class="${g.sb > g.sa ? "bold" : ""}">${plLinks(g.b)}</div></div>`).join("");
  return `<p><a href="#/programma">← Programma</a></p>
  <section class="card"><div class="mute small">Speelronde ${m.round} · wedstrijd ${m.no} · ${dt(m.start)} · ${esc(m.venue)}</div>
  <div class="match" style="border:0"><div class="t a" style="font-size:1.2rem"><b>${tl(m.home)}</b></div><div class="sc" style="font-size:1.6rem">${fin ? `${m.sa} – ${m.sb}` : "vs"}</div><div class="t" style="font-size:1.2rem"><b>${tl(m.away)}</b></div></div></section>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>${fin ? "Voorspelling vooraf" : "Winstkansen"} <small>model</small></h3>${probBar(pr, [esc(T[m.home].name.split(":")[0]) + " wint", "Gelijk", esc(T[m.away].name.split(":")[0]) + " wint"])}
      <p class="small mute">Verwachte uitslag: ${fmt(pr.ef)} – ${fmt(6 - pr.ef)}. Ratinggemiddelde: ${T[m.home].strength} vs ${T[m.away].strength}.</p>
      <table><tbody>${dist}</tbody></table></div>
    <div class="card"><h3>${fin ? "Partijen" : "Opstelling-adviseur"}</h3>${fin ? games || '<p class="mute">Geen partijdetails.</p>' : `<p class="mute small">Bekijk de <a href="#/voorspel/${m.home}/${m.away}">voorspeller</a> om de beste opstelling tegen deze tegenstander te laten berekenen en je eigen opstelling te testen.</p>`}</div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Eerdere ontmoetingen <small>alle seizoenen</small></h3>${meetings(m.home, m.away)}</div>
  <div class="grid g2" style="margin-top:16px">${[m.home, m.away].map((t) => `<div class="card"><h3>${tl(t)} <small>#${T[t].table.pos} · ${T[t].table.pts} pnt</small></h3><div>${form(T[t].form)}</div>
    <table style="margin-top:8px"><tbody>${teamPlayers(t).sort((a, b) => b.rating - a.rating).map((p) => `<tr><td>${pl(p.id)}</td><td class="n">${p.rating}</td></tr>`).join("")}</tbody></table></div>`).join("")}</div>`;
};

views.teams = () => `<h1>Teams</h1><div class="grid g3">${standings().map((t) => `<a class="card" href="#/team/${t.id}" style="color:inherit;text-decoration:none">
  <h3>${esc(t.name)} <small>#${t.table.pos}</small></h3><div class="mute small">${esc(t.venue)}</div><div style="margin:8px 0">${form(t.form)}</div>
  <div class="rowline"><span class="lb">Punten</span>${meter(t.table.pts / Math.max(1, ...D.teams.map((x) => x.table.pts)))}<span class="v">${t.table.pts}</span></div>
  <div class="rowline"><span class="lb">Rating⌀</span>${meter((t.strength - 900) / 400)}<span class="v">${t.strength}</span></div>
  <div class="rowline"><span class="lb">Titelkans</span>${meter(t.race.title, "gold")}<span class="v">${pct1(t.race.title)}</span></div></a>`).join("")}</div>`;

views.team = (id) => {
  id = Number(id);
  const t = T[id];
  if (!t) return `<p class="empty">Team niet gevonden.</p>`;
  const b = t.table, pls = teamPlayers(id).sort((a, b2) => b2.rating - a.rating);
  const disc = DISCS.map((d) => { const v = t.disc[d]; const lg = D.leagueDisc[d]; const x = pctDisc(v), y = pctDisc(lg);
    return `<div class="rowline"><span class="lb">${DN[d]}</span>${meter(x ?? 0)}<span class="v">${x == null ? "–" : pct(x)} <span class="mute small">(${v?.[1] ?? 0}/${v?.[0] ?? 0})</span></span></div>${y != null ? `<div class="mute small" style="margin:-4px 0 4px 130px">competitie ${pct(y)}</div>` : ""}`; }).join("");
  const sched = D.matches.filter((m) => m.home === id || m.away === id).sort((a, b2) => a.start.localeCompare(b2.start));
  const posProb = t.race.pos.map((v, i) => `<td style="background:color-mix(in srgb,var(--felt) ${Math.round(v * 100)}%,transparent)" title="${i + 1}e: ${pct(v)}">${v >= 0.01 ? Math.round(v * 100) : ""}</td>`).join("");
  return `<p><a href="#/teams">← Teams</a></p>
  <section class="card"><div class="phead"><div class="hex">${b.pos}<small>POSITIE</small></div><div><h1 style="margin:0">${esc(t.name)}</h1><div class="mute">${esc(t.venue)}</div><div style="margin-top:6px">${form(t.form)} <span class="pill">${b.pts} punten</span> <span class="pill">${b.w}W ${b.d}G ${b.l}V</span> <span class="pill">partijen ${b.fw}-${b.fl}</span></div></div></div></section>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Kansen op eindklassering <small>verwacht ${fmt(t.race.expPts, 0)} punten</small></h3>
      <table class="heat"><thead><tr>${t.race.pos.map((_, i) => `<th class="center">${i + 1}</th>`).join("")}</tr></thead><tbody><tr>${posProb}</tr></tbody></table>
      <p class="small mute">Titel (promotie) ${pct1(t.race.title)} · top 3 ${pct1(t.race.top3)}</p></div>
    <div class="card"><h3>Winst per spelsoort</h3>${disc}</div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Selectie</h3><div class="tw"><table class="sortable"><thead><tr><th data-s>Speler</th><th class="n" data-s>Rating</th><th class="n" data-s>MVP%</th><th class="n" data-s>Seizoen ±</th></tr></thead><tbody>
      ${pls.map((p) => `<tr><td>${pl(p.id)}</td><td class="n">${p.rating}</td><td class="n">${p.mvp != null ? fmt(p.mvp) : "–"}</td><td class="n ${p.season.delta >= 0 ? "win" : "lose"}">${sgn(p.season.delta)}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="card"><h3>Verbeterpunten &amp; sterke punten</h3>${tipsHtml("teams", id)}</div>
  </div>
  <div class="grid g2" style="margin-top:16px"><div class="card"><h3>Seizoenshistorie</h3>${teamHistory(id)}</div>
  <div class="card"><h3>Onderlinge historie</h3>${D.teams.filter((x) => x.id !== id).map((x) => { const ms = D.history.meetings.filter((m) => (m.home === id && m.away === x.id) || (m.home === x.id && m.away === id)); if (!ms.length) return ""; let w = 0, d = 0, l = 0; ms.forEach((m) => { const s1 = m.home === id ? m.sa : m.sb, s2 = m.home === id ? m.sb : m.sa; s1 > s2 ? w++ : s1 < s2 ? l++ : d++; }); return `<div class="rowline"><span class="lb" style="width:170px">${tl(x.id)}</span>${meter(w / ms.length)}<span class="v">${w}-${d}-${l}</span></div>`; }).join("") || '<p class="mute small">Geen data.</p>'}</div></div>
  <div class="card" style="margin-top:16px"><h3>Programma</h3>${sched.map((m) => matchRow(m, id)).join("")}</div>`;
};

views.spelers = () => {
  const rows = Object.values(P).sort((a, b) => b.rating - a.rating);
  return `<h1>Spelers</h1><p class="mute">${rows.length} spelers die dit seizoen speelden. Klik op een kolomkop om te sorteren. Per spelsoort en bij koppel: gewonnen/gespeeld.</p><div class="card tw"><table class="sortable"><thead><tr><th data-s>Speler</th><th data-s>Team</th><th class="n" data-s>Rating</th><th class="n" data-s>MVP%</th>${DISCS.map((d) => `<th class="n hide-s" data-s>${DN[d]}</th>`).join("")}<th class="n hide-s" data-s title="Koppel: gewonnen/gespeeld">Koppel</th><th class="n" data-s>Seizoen ±</th></tr></thead><tbody>
  ${rows.map((p) => `<tr class="${p.team === myTeam() ? "me" : ""}"><td>${pl(p.id)}</td><td class="small">${tl(p.team)}</td><td class="n bold">${p.rating}</td><td class="n">${p.mvp != null ? fmt(p.mvp) : "–"}</td>${DISCS.map((d) => { const v = p.disc[d]; return `<td class="n hide-s" data-v="${v && v[0] ? v[1] / v[0] : -1}">${v && v[0] ? `${v[1]}/${v[0]}` : "–"}</td>`; }).join("")}<td class="n hide-s" data-v="${p.dbl[0] ? p.dbl[1] / p.dbl[0] : -1}" title="${p.dbl[0] ? `${p.dbl[1]} gewonnen, ${p.dbl[0] - p.dbl[1]} verloren` : "Geen koppel gespeeld"}">${p.dbl[0] ? `${p.dbl[1]}/${p.dbl[0]}` : "–"}</td><td class="n ${p.season.delta >= 0 ? "win" : "lose"}">${sgn(p.season.delta)}</td></tr>`).join("")}</tbody></table></div>`;
};

views.speler = (id) => {
  id = Number(id);
  const p = P[id];
  if (!p) return `<p class="empty">Speler niet gevonden.</p>`;
  const hist = [...p.hist].reverse(); // oud -> nieuw
  const pts = hist.map((r) => ({ y: r.r, label: `${r.date} vs ${r.oppName}`, group: r.tn.replace(/^Pool /, "") }));
  const cards = DISCS.map((d) => { const v = p.disc[d] || [0, 0, 0, 0]; const x = v[0] ? v[1] / v[0] : null;
    return `<div class="rowline"><span class="lb">${DN[d]}</span>${meter(x ?? 0)}<span class="v">${x == null ? "–" : pct(x)} <span class="mute small">${v[1]}/${v[0]}</span></span></div>`; }).join("")
    + `<div class="rowline"><span class="lb">Dubbel</span>${meter(p.dbl[0] ? p.dbl[1] / p.dbl[0] : 0)}<span class="v">${p.dbl[0] ? pct(p.dbl[1] / p.dbl[0]) : "–"} <span class="mute small">${p.dbl[1]}/${p.dbl[0]}</span></span></div>`;
  const seasonGames = gamesOf(id).sort((a, b) => b.g.start.localeCompare(a.g.start));
  const groups = {};
  for (const r of p.hist) (groups[r.tn] ||= []).push(r);
  const h2h = Object.entries(p.h2h).map(([o, v]) => ({ o: Number(o), w: v[0], l: v[1] })).sort((a, b) => b.w + b.l - (a.w + a.l));
  const c = p.career;
  return `<p><a href="#/spelers">← Spelers</a></p>
  <section class="card"><div class="phead"><div class="hex">${p.rating}<small>RATING</small></div>
  <div style="flex:1;min-width:220px"><h1 style="margin:0">${esc(p.name)}</h1><div class="mute">${tl(p.team)}</div>
  <div style="margin-top:8px"><span class="pill gold">Ranking #${Object.values(P).filter((x) => x.rating > p.rating).length + 1} van ${Object.keys(P).length}</span> ${p.mvp != null ? `<span class="pill green">MVP ${fmt(p.mvp)}%</span>` : ""} <span class="pill">Seizoen ${sgn(p.season.delta)}</span> ${p.streak >= 2 ? `<span class="pill gold">🔥 ${p.streak} gewonnen op rij</span>` : ""} ${c ? `<span class="pill">Totaal ${c.wins}W-${c.losses}V</span>` : ""}</div>
  <p class="small" style="margin-bottom:0"><a href="${cueUrl(p)}" target="_blank" rel="noopener">CueScore-profiel ↗</a> · <a href="${ratingUrl(p)}" target="_blank" rel="noopener">Ratingdetails ↗</a></p></div></div></section>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Winst per spelsoort <small>dit seizoen</small></h3>${cards}</div>
    <div class="card"><h3>Inzichten</h3>${tipsHtml("players", id)}</div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Per seizoen</h3><div class="tw"><table><thead><tr><th>Seizoen</th><th>Team</th><th class="n">MVP%</th>${DISCS.map((d) => `<th class="n">${DN[d]}</th>`).join("")}<th class="n">Dubbel</th></tr></thead><tbody>
  ${Object.entries(p.seasons).map(([lb, s]) => `<tr><td>${esc(lb)}</td><td class="small">${esc(D.history.teamNames[s.team]?.[lb] ?? T[s.team]?.name ?? "")}</td><td class="n">${s.mvp != null ? fmt(s.mvp) : "–"}</td>${DISCS.map((d) => { const v = s.disc?.[d]; return `<td class="n">${v && v[0] ? `${v[1]}/${v[0]} <span class="mute small">${pct(v[1] / v[0])}</span>` : "–"}</td>`; }).join("")}<td class="n">${s.dbl && s.dbl[0] ? `${s.dbl[1]}/${s.dbl[0]}` : "–"}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="card" style="margin-top:16px"><h3>Ratingverloop <small>${p.hist.length} gespeelde partijen</small></h3>${lineChart(pts)}</div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Partijen dit seizoen</h3>${seasonGames.length ? seasonGames.map(({ m, g, side }) => { const my = side === "a" ? g.sa : g.sb, th = side === "a" ? g.sb : g.sa, oppIds = side === "a" ? g.b : g.a; const partner = (side === "a" ? g.a : g.b).filter((x) => x !== id);
      return `<div class="game"><div class="dc">${g.dbl ? "Dubbel " : ""}${DN[g.d]}</div><div class="${my > th ? "win" : "lose"} bold">${my > th ? "Winst" : "Verlies"}${partner.length ? ` <span class="mute small">met ${plLinks(partner)}</span>` : ""}</div><div class="sc">${my} – ${th}</div><div>${plLinks(oppIds)}<br><a class="small mute" href="#/wedstrijd/${m.id}">ronde ${m.round}</a></div></div>`; }).join("") : '<p class="mute">Nog geen partijen.</p>'}</div>
    <div class="card"><h3>Onderling (dit seizoen)</h3>${h2h.length ? `<table><tbody>${h2h.map((r) => `<tr><td>${pl(r.o)}</td><td class="n bold">${r.w} – ${r.l}</td></tr>`).join("")}</tbody></table>` : '<p class="mute">Nog geen onderlinge partijen.</p>'}</div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Eerdere partijen &amp; seizoenen <small>uit de KNBB-rating</small></h3>
  ${Object.entries(groups).map(([tn, rows]) => `<h3 class="mute small" style="margin-top:14px">${esc(tn)}</h3><div class="tw"><table><thead><tr><th>Datum</th><th>Tegenstander</th><th class="n">Rating tegenst.</th><th class="n">Score</th><th class="n">±</th><th class="n">Rating</th></tr></thead><tbody>
  ${rows.map((r) => `<tr><td class="nowrap">${r.date.split("-").reverse().join("-")}</td><td>${pl(r.opp, r.oppName)}</td><td class="n">${r.oppR ?? "–"}</td><td class="n bold ${r.win ? "win" : "lose"}">${r.s} – ${r.o}</td><td class="n ${r.delta >= 0 ? "win" : "lose"}">${sgn(r.delta)}</td><td class="n">${r.r}</td></tr>`).join("")}</tbody></table></div>`).join("")}</div>`;
};

views.ranking = () => {
  const rows = Object.values(P).filter((p) => p.rated).sort((a, b) => b.rating - a.rating);
  return `<h1>Ranking</h1><p class="mute">Alle spelers uit de competitie, gerangschikt op persoonlijke KNBB Pool Rating (Elo-systeem). Het pijltje toont het verloop over de laatste 15 partijen.</p>
  <div class="card tw"><table class="sortable"><thead><tr><th class="n" data-s>#</th><th data-s>Speler</th><th data-s>Team</th><th class="n" data-s>Rating</th><th class="n hide-s" data-s>Seizoen ±</th><th class="hide-s">Verloop</th><th class="n hide-s" data-s>Totaal W-V</th></tr></thead><tbody>
  ${rows.map((p, i) => `<tr class="${p.team === myTeam() ? "me" : ""}"><td class="n">${i + 1}</td><td>${pl(p.id)}</td><td class="small">${tl(p.team)}</td><td class="n bold">${p.rating}</td><td class="n hide-s ${p.season.delta >= 0 ? "win" : "lose"}">${sgn(p.season.delta)}</td><td class="hide-s">${spark(p.hist.slice(0, 15).reverse().map((r) => r.r))}</td><td class="n hide-s" data-v="${p.career ? p.career.wins : 0}">${p.career ? `${p.career.wins}-${p.career.losses}` : "–"}</td></tr>`).join("")}</tbody></table></div>`;
};

views.mvp = () => {
  const L = D.mvpList || [];
  const COL = [2, 5, 3, 4]; // volgorde van CueScore
  const cell = (v) => (v && v[0] ? `${v[1]}/${v[0]} <span class="mute small">${v[2]}–${v[3]}</span>` : '<span class="mute">–</span>');
  return `<h1>MVP</h1><p class="mute">De MVP-lijst van CueScore, in dezelfde volgorde. Spelers met minder dan 60% deelname staan er niet bij. Per spelsoort: gewonnen/gespeeld en frames (bij straight pool punten) voor–tegen. <a href="${esc(D.meta.tournamentUrl)}/mvp" target="_blank" rel="noopener">Bekijk op CueScore ↗</a></p>
  <div class="card tw"><table><thead><tr><th class="n">#</th><th>Speler</th><th class="hide-s">Team</th><th class="n">MVP%</th>${COL.map((d) => `<th class="n hide-s">${DN[d]}</th>`).join("")}<th class="n">Potten</th><th class="n hide-s">Deelname</th></tr></thead><tbody>
  ${L.map((r) => `<tr><td class="n">${r.pos}</td><td>${pl(r.id, r.name)}</td><td class="hide-s">${esc(T[P[r.id]?.team ?? r.team]?.name ?? "")}</td><td class="n"><b>${r.mvp != null ? fmt(r.mvp) + "%" : "–"}</b></td>${COL.map((d) => `<td class="n hide-s">${cell(r.d[d])}</td>`).join("")}<td class="n">${r.mp}</td><td class="n hide-s">${r.pr != null ? fmt(r.pr) + "%" : "–"}</td></tr>`).join("")}</tbody></table></div>`;
};

views.top10 = () => {
  const A = D.awards;
  const list = (title, sub, rows, val) => `<div class="card"><h3>${title}</h3><div class="mute small" style="margin:-6px 0 8px">${sub}</div>${rows.length ? `<ol class="top10">${rows.map((r, i) => `<li><span class="rk">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span><span class="nm">${pl(r.id)} <span class="mute small">${esc(T[P[r.id]?.team]?.name ?? "")}</span></span><span class="vl">${val(r)}</span></li>`).join("")}</ol>` : '<p class="mute small">Nog geen data.</p>'}</div>`;
  return `<h1>Top 10 &amp; awards</h1><div class="grid g3">
  ${list("⭐ MVP", "CueScore MVP-score (min. 5 potten gespeeld) · <a href=\"#/mvp\">volledige lijst →</a>", A.mvp, (r) => `${fmt(r.v)}% <span class="mute small">${r.n} potten</span>`)}
  ${list("🏆 Hoogste rating", "KNBB Pool Rating", A.rating, (r) => r.v)}
  ${list("📈 Grootste stijger", "Ratingwinst dit seizoen", A.risers, (r) => sgn(r.v))}
  ${DISCS.filter((d) => d !== 5).map((d) => list(`🎱 Beste ${DN[d]}`, "Winst% (min. 3 partijen)", A.disc[d], (r) => `${pct(r.pct)} <span class="mute small">${r.w}/${r.n}</span>`)).join("")}
  ${list("🅂 Beste straight pool", "Winst% (min. 3 partijen)", A.disc[5], (r) => `${pct(r.pct)} <span class="mute small">${r.w}/${r.n}</span>`)}
  ${list("👥 Beste dubbelspeler", "Winst% in dubbels (min. 3 partijen)", A.doublesTop, (r) => `${pct(r.pct)} <span class="mute small">${r.w}/${r.n}</span>`)}
  ${list("🧰 Alleskunner", "Meeste spelsoorten gewonnen/gespeeld, hoogste winst%", A.allround, (r) => `${pct(r.pct)} <span class="mute small">${r.kinds} soorten</span>`)}
  ${list("🔥 Winstreeks", "Op rij gewonnen (huidige reeks)", A.streaks, (r) => r.v)}
  ${list("🎯 Straight pool-scorer", "Gemiddeld aantal punten per partij (min. 3 partijen)", A.straightpoints, (r) => fmt(r.avg))}
  <div class="card"><h3>💥 Grootste stunts</h3><div class="mute small" style="margin:-6px 0 8px">Winst op tegenstander met hogere rating</div><ol class="top10">${A.upsets.map((r, i) => `<li><span class="rk">${i + 1}</span><span class="nm">${pl(r.id)} <span class="mute small">won van</span> ${pl(r.opp)}</span><span class="vl">+${r.diff}</span></li>`).join("")}</ol></div>
  </div>`;
};

const present = {}; // teamId -> Set aanwezige spelers (blijft onthouden tijdens het bezoek)
let after = null;
const presOf = (t) => (present[t] ||= new Set());

views.voorspel = (a, b) => {
  const tid = myTeam();
  const A = Number(a) || tid;
  const nm = nextMatch(A);
  let B = Number(b) || (nm ? (nm.home === A ? nm.away : nm.home) : D.teams.find((t) => t.id !== A).id);
  if (B === A) B = D.teams.find((t) => t.id !== A).id;
  const opts = (sel) => D.teams.map((t) => `<option value="${t.id}" ${t.id === sel ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  const picks = (t) => `<div class="picks" data-team="${t}">${teamPlayers(t).sort((x, y) => y.rating - x.rating).map((p) => `<label><input type="checkbox" value="${p.id}" ${presOf(t).has(p.id) ? "checked" : ""}> ${esc(p.name)} <span class="mute small">${p.rating}</span></label>`).join("")}</div>`;
  const lineHtml = (best, X, slots) => best.assign.map((x, i) => { const [d, dbl] = slots[i]; return `<div class="slot"><span class="mute small">${i + 1}. ${dbl ? "Dubbel " : ""}${DN[d]}</span><span>${(dbl ? x : [x]).map((id) => pl(id)).join(" &amp; ")}</span><span class="n bold right">${pct(best.probs[i])}</span></div>`; }).join("");
  after = () => {
    const root = document.getElementById("pv");
    const paint = () => {
      const pa = [...presOf(A)], pb = [...presOf(B)];
      const o = outcome(matchDist(D, A, B, P, T, pa, pb));
      const base = outcome(matchDist(D, A, B, P, T));
      const tag = pa.length || pb.length ? "op basis van aanwezige spelers" : "verwachte opstelling (uit seizoensdata)";
      document.getElementById("pv-odds").innerHTML = `<h3>${esc(T[A].name)} vs ${esc(T[B].name)} <small>${tag}</small></h3>${probBar(o)}
        <p class="small mute">Verwachte uitslag ${fmt(o.ef)} – ${fmt(6 - o.ef)} partijen.</p>
        <table><tbody>${o.dist.map((v, k) => `<tr><td class="nowrap">${k} – ${6 - k}</td><td style="width:62%">${meter(v, k > 3 ? "" : k === 3 ? "gold" : "red")}</td><td class="n">${pct(v)}</td></tr>`).join("")}</tbody></table>`;
      const slots = D.meta.slots;
      const bestA = bestLineup(D, A, B, P, T, pa, pb);
      document.getElementById("pv-line").innerHTML = bestA
        ? `<h3>Beste opstelling ${esc(T[A].name.split(":")[0])}</h3><div class="mute small">Uit ${pa.length} aanwezige spelers${pb.length ? `, tegen ${pb.length} aanwezige tegenstanders` : ", tegen de verwachte opstelling van de tegenstander"}. Iedereen speelt; max. 2,5 wedstrijd per speler (enkel = 1, koppel = 0,5) en hooguit 1 speler met 3 potten, eerlijk verdeeld.${bestA.cut ? ` Let op: er zijn maar 7 plekken, dus ${bestA.cut} speler(s) met de laagste rating spelen niet.` : ""}</div>
           <div class="lineup">${lineHtml(bestA, A, slots)}</div>
           <p style="margin-top:10px">Winstkans met dit advies: <b class="win">${pct(bestA.win)}</b> · gelijk ${pct(bestA.draw)} · verlies ${pct(bestA.loss)}</p>${probBar(bestA)}
           <p class="small mute">Speelbeurten: ${Object.entries(bestA.load).map(([id, n]) => `${esc(P[id].name.split(" ")[0])} ${n}`).join(" · ")}</p>`
        : `<h3>Beste opstelling ${esc(T[A].name.split(":")[0])}</h3><div class="placeholder">Vink hierboven aan wie er bij <b>${esc(T[A].name)}</b> aanwezig is (minimaal 3 spelers).<br>Het advies wordt dan alleen uit die spelers samengesteld.</div>`;
      const bestB = bestLineup(D, B, A, P, T, pb, pa);
      document.getElementById("pv-lineB").innerHTML = bestB
        ? `<h3>Beste opstelling ${esc(T[B].name.split(":")[0])} <small>tegenstander</small></h3><div class="lineup">${lineHtml(bestB, B, slots)}</div><p>Hun winstkans met deze opstelling: <b>${pct(bestB.win)}</b></p>`
        : `<h3>Beste opstelling tegenstander</h3><div class="placeholder">Vink aan wie er bij <b>${esc(T[B].name)}</b> aanwezig is om hun beste opstelling te zien.</div>`;
    };
    root.querySelectorAll(".picks").forEach((box) => box.addEventListener("change", (e) => {
      const set = presOf(Number(box.dataset.team));
      e.target.checked ? set.add(Number(e.target.value)) : set.delete(Number(e.target.value));
      paint();
    }));
    root.querySelectorAll("[data-all]").forEach((btn) => btn.addEventListener("click", () => {
      const t = Number(btn.dataset.all), set = presOf(t);
      const on = btn.dataset.mode === "on";
      set.clear(); if (on) T[t].players.forEach((id) => set.add(id));
      root.querySelectorAll(`.picks[data-team="${t}"] input`).forEach((i) => (i.checked = on));
      paint();
    }));
    paint();
  };
  return `<h1>Voorspeller</h1><p class="mute">Kies twee teams en vink aan wie er speelt. De kansen en het opstellingsadvies passen zich direct aan.</p>
  <div class="sel"><label>Team<select id="va">${opts(A)}</select></label><label>Tegenstander<select id="vb">${opts(B)}</select></label></div>
  <div id="pv">
  <div class="grid g2"><div class="card"><h3>Wie is er aanwezig?</h3>
    <div class="bold">${esc(T[A].name)} <button class="btn small" data-all="${A}" data-mode="on">allemaal</button> <button class="btn small" data-all="${A}" data-mode="off">niemand</button></div>${picks(A)}
    <div class="bold">${esc(T[B].name)} <button class="btn small" data-all="${B}" data-mode="on">allemaal</button> <button class="btn small" data-all="${B}" data-mode="off">niemand</button></div>${picks(B)}
    <p class="small mute">Tip: alle aangevinkte spelers spelen mee en de beurten worden eerlijk verdeeld (max. 2,5 wedstrijd, hooguit 1 speler met 3 potten). Niets aangevinkt = verwachte opstelling.</p></div>
  <div class="card" id="pv-odds"></div></div>
  <div class="grid g2" style="margin-top:16px"><div class="card lineup" id="pv-line"></div><div class="card lineup" id="pv-lineB"></div></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Eerdere ontmoetingen <small>alle seizoenen</small></h3>${meetings(A, B)}</div>`;
};

views.titelrace = () => {
  const rows = standings().sort((a, b) => b.race.expPts - a.race.expPts);
  const n = D.teams.length;
  return `<h1>Titelrace</h1><p class="mute">Elk vakje: kans (in %) dat het team op die eindpositie eindigt. Gebaseerd op ${D.meta.sims.toLocaleString("nl-NL")} simulaties van alle nog te spelen wedstrijden met het ratingmodel. Het model houdt rekening met onzekerheid: de sterkte van een team is nog niet zeker (vroeg in het seizoen veel, later steeds minder) en elke wedstrijd kan door opstelling of dagvorm anders lopen. Daarom zijn de kansen vroeg in het seizoen bewust niet extreem.</p>
  <div class="card tw"><table class="heat"><thead><tr><th style="text-align:left">Team</th>${Array.from({ length: n }, (_, i) => `<th class="center">${i + 1}</th>`).join("")}<th class="n">Titel</th><th class="n">Top 3</th><th class="n">Verw. pnt</th></tr></thead><tbody>
  ${rows.map((t) => `<tr><td style="text-align:left;white-space:nowrap">${tl(t.id)}</td>${t.race.pos.map((v, i) => `<td style="background:color-mix(in srgb,${i < D.meta.promotion ? "var(--gold)" : "var(--felt)"} ${Math.round(v * 100)}%,transparent)">${v >= 0.005 ? Math.round(v * 100) : ""}</td>`).join("")}<td class="n bold">${pct1(t.race.title)}</td><td class="n">${pct1(t.race.top3)}</td><td class="n">${fmt(t.race.expPts, 0)}</td></tr>`).join("")}</tbody></table></div>
  <p class="note" style="margin-top:14px">Alleen de nummer 1 promoveert; er is geen degradatie.</p>`;
};

views.scorebord = (sub) => { after = () => SCOREBORD.mount(document.getElementById("sb"), sub); return `<div id="sb"></div>`; };

views.regels = (sub) => {
  const R = window.REGELS;
  const tab = R.tabs.find((t) => t.id === sub) ? sub : "competitie";
  const s = R.secties[tab];
  const body = s.tabel
    ? `<div class="card tw"><table><thead><tr>${s.tabel.kop.map((k) => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${s.tabel.rijen.map((r) => `<tr>${r.map((c, i) => `<${i ? "td" : "th"} ${i ? "" : 'style="color:var(--text)"'}>${esc(c)}</${i ? "td" : "th"}>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : `<div class="grid g2">${s.blokken.map((b) => `<div class="card"><h3>${esc(b.k)}</h3><ul class="rules">${b.l.map((x) => `<li>${x}</li>`).join("")}</ul></div>`).join("")}</div>`;
  return `<h1>Poolregels</h1><div class="tabs">${R.tabs.map((t) => `<a class="btn ${t.id === tab ? "primary" : ""}" href="#/regels/${t.id}">${t.icon} ${esc(t.titel)}</a>`).join("")}</div>
  <p class="mute">${esc(s.intro)}</p>${body}<p class="note" style="margin-top:16px">${esc(R.bron)}</p>`;
};

views.seizoenen = () => `<h1>Seizoenen</h1><p class="mute">Eindstanden van eerdere seizoenen. Teams die van naam veranderden (zoals Get Racked) staan onder hun huidige team.</p>
  <div class="grid g2">${[...D.history.seasons].reverse().map((s) => `<div class="card"><h3>${esc(s.label)} <small>${s.current ? "lopend" : "eindstand"}</small></h3><table><thead><tr><th class="n">#</th><th>Team</th><th class="n">Gesp</th><th class="n">Partijen</th><th class="n">Pnt</th></tr></thead><tbody>
  ${s.standings.map((r) => `<tr class="${r.team === myTeam() ? "me" : ""}"><td class="n">${r.pos}</td><td>${T[r.team] ? tl(r.team).replace(/>[^<]*</, ">" + esc(r.name) + "<") : esc(r.name)}</td><td class="n">${r.played}</td><td class="n">${r.fw}-${r.fl}</td><td class="n bold">${r.pts}</td></tr>`).join("")}</tbody></table></div>`).join("")}</div>`;

views.over = () => `<h1>Over dit portaal</h1>
  <div class="grid g2"><div class="card"><h3>Bronnen &amp; updates</h3><p>Alle gegevens komen van <a href="https://cuescore.com" target="_blank" rel="noopener">CueScore</a>: <a href="${D.meta.tournamentUrl}" target="_blank" rel="noopener">de competitie</a>, de MVP-pagina, spelersprofielen en de <a href="${D.meta.ratingUrl}" target="_blank" rel="noopener">KNBB Pool Rating</a>. Drie keer per dag (ook 's avonds na de speelavonden) wordt de data automatisch ververst.</p><p class="mute small">Laatst bijgewerkt: ${new Date(D.meta.updated).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}</p></div>
  <div class="card"><h3>Hoe werken de voorspellingen?</h3><ol class="small"><li>De KNBB-rating is een Elo-rating: kans dat A wint = 1 / (1 + 10<sup>(Rb−Ra)/400</sup>).</li><li>Per spelsoort corrigeren we de rating met de (gekrompen) winstrate van de speler in die spelsoort dit seizoen.</li><li>Een teamwedstrijd bestaat uit 6 partijen. Wie speelt is niet bekend; per partij wegen we spelers naar hoe vaak ze die spelsoort speelden.</li><li>De kans op elke uitslag (0–6 partijen) volgt exact uit de 6 partijkansen: winst = 4 of meer, gelijk = 3.</li><li>Titel/top 3: ${D.meta.sims.toLocaleString("nl-NL")} Monte-Carlo-simulaties van alle resterende wedstrijden.</li></ol><p class="mute small">Een model is geen glazen bol: met weinig gespeelde wedstrijden zijn de kansen onzeker. Ze worden elke ronde scherper.</p></div></div>`;

// ------------------------------------------------------------------ router
const routes = { "": "dashboard", stand: "stand", programma: "programma", wedstrijd: "wedstrijd", teams: "teams", team: "team", spelers: "spelers", speler: "speler", ranking: "ranking", top10: "top10", mvp: "mvp", voorspel: "voorspel", titelrace: "titelrace", regels: "regels", scorebord: "scorebord", seizoenen: "seizoenen", over: "over" };
function render() {
  const [r = "", ...args] = location.hash.replace(/^#\/?/, "").split("/");
  const name = routes[r] ?? "dashboard";
  if (window.SCOREBORD) SCOREBORD.release();
  try { $app.innerHTML = views[name](...args); } catch (e) { console.error(e); $app.innerHTML = `<p class="empty">Er ging iets mis bij het weergeven van deze pagina.</p>`; }
  document.querySelectorAll("#tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.r.split(" ").includes(r)));
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.r.split(" ").includes(r)));
  document.getElementById("nav").classList.remove("open");
  sortable($app);
  if (after) { const f = after; after = null; f(); }
  const pf = document.getElementById("pf"); if (pf) pf.onchange = () => (location.hash = `#/programma/${pf.value}`);
  const va = document.getElementById("va"), vb = document.getElementById("vb");
  if (va) { va.onchange = vb.onchange = () => (location.hash = `#/voorspel/${va.value}/${vb.value}`); }
  window.scrollTo(0, 0);
  document.title = `Pool Portaal – ${{ dashboard: "Dashboard", stand: "Stand", programma: "Programma", wedstrijd: "Wedstrijd", teams: "Teams", team: T[args[0]]?.name ?? "Team", spelers: "Spelers", speler: P[args[0]]?.name ?? "Speler", ranking: "Ranking", top10: "Top 10", mvp: "MVP", voorspel: "Voorspeller", titelrace: "Titelrace", regels: "Poolregels", scorebord: "Scorebord", seizoenen: "Seizoenen", over: "Over" }[name]}`;
}

function init() {
  D = window.POOL_DATA;
  if (!D) throw new Error("data/data.js ontbreekt");
  D.teams.forEach((t) => (T[t.id] = t));
  Object.values(D.players).forEach((p) => (P[p.id] = p));
  document.getElementById("seasonLabel").textContent = `${D.meta.name.replace(/^Pool /, "")}`;
  document.getElementById("updated").textContent = "Bijgewerkt " + dtl.format(new Date(D.meta.updated));
  const sel = document.getElementById("myTeam");
  sel.innerHTML = D.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
  sel.value = myTeam();
  sel.onchange = () => { localStorage.setItem("myTeam", sel.value); render(); };
  const th = document.getElementById("theme");
  th.value = document.documentElement.dataset.theme || "blue";
  th.onchange = () => { document.documentElement.dataset.theme = th.value; try { localStorage.setItem("theme", th.value); } catch (e) {} };
  document.getElementById("more").onclick = (e) => { e.preventDefault(); document.getElementById("nav").classList.toggle("open"); window.scrollTo(0, 0); };
  document.getElementById("burger").onclick = () => document.getElementById("nav").classList.toggle("open");
  window.addEventListener("hashchange", render);
  render();
}
try { init(); } catch (e) { console.error(e); $app.innerHTML = `<p class="empty">Data kon niet worden geladen: ${esc(e.message)}</p>`; }

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
