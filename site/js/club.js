// Verenigingspagina's (Infinity): overzicht over alle teams van de vereniging, in alle competities.
// Gebruikt de helpers uit app.js (esc, pct, fmt, dt, dtl, form, ...) en de data uit data/infinity.js (window.POOL_CLUB).

const CLUB_ROUTES = { "": "overzicht", standen: "standen", mvp: "mvp", spelers: "spelers", weetjes: "weetjes", toernooien: "toernooien", lucky9: "lucky9", scorebord: "scorebord", regels: "regels", over: "over" };
const CLUB_NAV = `
    <a href="#/" data-r="">Overzicht</a>
    <a href="#/standen" data-r="standen">Standen</a>
    <a href="#/mvp" data-r="mvp">MVP</a>
    <a href="#/spelers" data-r="spelers">Top spelers</a>
    <a href="#/weetjes" data-r="weetjes">Weetjes</a>
    <a href="#/toernooien" data-r="toernooien">Toernooien</a>
    <a href="#/lucky9" data-r="lucky9">Lucky 9</a>
    <a href="#/scorebord" data-r="scorebord">Scorebord</a>
    <a href="#/regels" data-r="regels">Regels</a>`;
const CLUB_TABBAR = `
  <a href="#/" data-r=""><span>🏠</span>Home</a>
  <a href="#/standen" data-r="standen"><span>📊</span>Standen</a>
  <a href="#/mvp" data-r="mvp"><span>⭐</span>MVP</a>
  <a href="#/toernooien" data-r="toernooien"><span>🏆</span>Toernooien</a>
  <a href="#" id="more" data-r="x"><span>☰</span>Meer</a>`;

const clubViews = {};
let C; // club-data
const cName = (id) => C.members.find((m) => m.id === id)?.name ?? id;
const cComp = (id) => C.members.find((m) => m.id === id)?.classes[0]?.comp;
const cPl = (id) => { const c = cComp(id); return c ? `<a href="#/${c}/speler/${id}">${esc(cName(id))}</a>` : esc(cName(id)); };
const cTeamLink = (t) => (t.found ? `<a href="#/${t.comp}/team/${t.teamId}">${esc(t.name)}</a>` : esc(t.name));
const memberTeams = (m) => m.teams.map((t) => esc(t.name)).join(" + ");
const POS_CLS = (t) => (t.table.pos <= t.promotion ? "green" : t.relegation && t.table.pos > t.nTeams - t.relegation ? "red" : "");

clubViews.overzicht = () => {
  const T0 = C.totals, found = C.teams.filter((t) => t.found);
  const nxt = C.tournaments.filter((t) => t.status === "Upcoming" || t.status === "Active").sort((a, b) => a.start.localeCompare(b.start))[0];
  const cards = C.teams.map((t) => {
    if (!t.found) return `<div class="card"><h3>${esc(t.name)}</h3><div class="mute small">${t.captain ? `Aanvoerder ${esc(t.captain)} · ` : ""}${esc(t.roster.join(", "))}</div>
      <p class="mute small" style="margin-top:8px">Competitie nog niet gekoppeld aan CueScore – zodra die bekend is, verschijnen hier stand en statistieken.</p></div>`;
    return `<div class="card"><div class="mute small">${esc(t.compLabel)}${t.day ? ` · ${esc(t.day)}` : ""}</div>
      <h3 style="margin:4px 0 8px">${cTeamLink(t)}</h3>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill ${POS_CLS(t)}">plek ${t.table.pos}/${t.nTeams}</span><b>${t.table.pts} pt</b><span class="mute small">${t.table.played} gespeeld</span>${form(t.form)}</div>
      <div class="mute small" style="margin-top:8px">Kans op titel ${pct1(t.race.title)} · top 3 ${pct1(t.race.top3)}${t.captain ? ` · aanvoerder ${esc(t.captain)}` : ""}</div></div>`;
  }).join("");
  const nextRows = C.upcoming.slice(0, 6).map((m) => `<tr><td class="nowrap small">${dt(m.start)}</td><td>${esc(m.team)}</td><td>${m.home ? "–" : "@"} ${esc(m.opp)}</td><td class="n small">${m.win != null ? pct(m.win) : ""}</td></tr>`).join("");
  const lastRows = C.recent.slice(0, 6).map((m) => `<tr><td class="nowrap small">${dtl.format(new Date(m.start))}</td><td>${esc(m.team)}</td><td>${m.home ? "–" : "@"} ${esc(m.opp)}</td><td class="n bold ${m.s > m.o ? "win" : m.s < m.o ? "lose" : ""}">${m.s}–${m.o}</td></tr>`).join("");
  const top3 = C.mvp.slice(0, 3).map((r, i) => `<tr><td class="n">${i + 1}</td><td>${cPl(r.id)}</td><td class="n bold">${fmt(r.v)}%</td></tr>`).join("");
  return `<section class="hero"><div class="mute" style="color:#cfe8d8">Vereniging</div><h1>${esc(C.meta.name)}</h1><div class="sub">Wageningen · ${found.length} teams in competitie · ${C.members.length} spelers</div>
    <div class="kpis"><div class="kpi"><b>${T0.w}-${T0.d}-${T0.l}</b><span>wedstrijden W-G-V</span></div><div class="kpi"><b>${pct(T0.fw / Math.max(1, T0.fw + T0.fl))}</b><span>partijen gewonnen</span></div>
    <div class="kpi"><b>${T0.played}</b><span>wedstrijden gespeeld</span></div><div class="kpi"><b>${C.members.length}</b><span>spelers actief</span></div></div></section>
  <h2>Onze teams</h2><div class="grid g3">${cards}</div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Eerstvolgende wedstrijden</h3>${nextRows ? `<table><tbody>${nextRows}</tbody></table><p class="mute small">Laatste kolom: kans op winst.</p>` : '<p class="mute">Geen openstaande wedstrijden.</p>'}</div>
    <div class="card"><h3>Laatste uitslagen</h3>${lastRows ? `<table><tbody>${lastRows}</tbody></table>` : '<p class="mute">Nog niet gespeeld.</p>'}</div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>MVP-top 3 <small><a href="#/mvp">alles →</a></small></h3>${top3 ? `<table><tbody>${top3}</tbody></table>` : '<p class="mute">Nog te weinig potten gespeeld.</p>'}</div>
    <div class="card"><h3>Eerstvolgend toernooi <small><a href="#/toernooien">alle toernooien →</a></small></h3>${nxt ? `<b>${esc(nxt.name)}</b><div class="mute small">${dtl.format(new Date(nxt.start))} · ${esc(nxt.discipline || "")}${nxt.players ? ` · ${nxt.players} inschrijvingen` : ""}</div><p><a href="https://cuescore.com/tournament/${nxt.slug}/${nxt.id}" target="_blank" rel="noopener">Inschrijven / info op CueScore ↗</a></p>` : '<p class="mute">Geen toernooien gepland.</p>'}</div>
  </div>`;
};

clubViews.standen = () => {
  const block = (t) => `<div class="card"><h3>${cTeamLink(t)} <small>${esc(t.compLabel)} ${esc(t.season)}</small></h3><div class="tw"><table><thead><tr><th class="n">#</th><th>Team</th><th class="n">Gesp.</th><th class="n">Pnt</th><th class="n hide-s">Partijen</th></tr></thead><tbody>
    ${t.standings.map((r) => `<tr class="${r.inf ? "me" : ""}"><td class="n">${r.pos}</td><td><a href="#/${t.comp}/team/${r.id}">${esc(r.name)}</a></td><td class="n">${r.played}</td><td class="n bold">${r.pts}</td><td class="n hide-s">${r.fw}–${r.fl}</td></tr>`).join("")}</tbody></table></div>
    <p class="small" style="margin-top:8px"><a href="#/${t.comp}/stand">Volledige stand &amp; voorspelling →</a></p></div>`;
  const seen = new Set(), blocks = [];
  for (const t of C.teams) {
    if (!t.found) continue;
    const k = t.comp;
    if (seen.has(k)) continue;
    seen.add(k);
    blocks.push(block(t));
  }
  const missing = C.teams.filter((t) => !t.found);
  return `<h1>Standen</h1><p class="mute">De stand in elke competitie waarin een Infinity-team speelt; onze teams zijn gemarkeerd. Teams in dezelfde klasse staan samen in één tabel.</p>
  <div class="grid g2">${blocks.join("")}</div>
  ${missing.length ? `<div class="card" style="margin-top:16px"><h3>Nog niet gekoppeld</h3><p class="small mute">${missing.map((t) => esc(t.name)).join(", ")} – deze competities staan nog niet op de site; zodra de CueScore-link bekend is komen ze erbij.</p></div>` : ""}`;
};

clubViews.mvp = () => {
  const ranked = C.mvp;
  const byId = Object.fromEntries(C.members.map((m) => [m.id, m]));
  return `<h1>MVP Infinity</h1><p class="mute">Alle Infinity-leden die in een competitie spelen, gerangschikt op hun MVP-score van CueScore (minimaal ${5} potten). De score is per klasse berekend; de laatste kolom toont de plek in de eigen klasse.</p>
  <div class="card tw"><table class="sortable"><thead><tr><th class="n" data-s>#</th><th data-s>Speler</th><th data-s>Team</th><th class="n" data-s>MVP%</th><th class="n" data-s>Potten</th><th class="n hide-s" data-s>Plek in klasse</th><th class="n hide-s" data-s>Rating</th></tr></thead><tbody>
  ${ranked.map((r, i) => { const m = byId[r.id], c = m.classes.find((x) => x.mvpPos != null) || m.classes[0]; return `<tr><td class="n">${i + 1}</td><td>${cPl(r.id)}</td><td class="small">${memberTeams(m)}</td><td class="n bold" data-v="${r.v}">${fmt(r.v)}%</td><td class="n">${r.mp}</td><td class="n hide-s" data-v="${c.mvpPos ?? 999}">${c.mvpPos ?? "–"} <span class="mute small">van ${c.of} · ${esc(c.compLabel.replace("Gelderland ", ""))}</span></td><td class="n hide-s">${m.rating}</td></tr>`; }).join("")}</tbody></table></div>
  ${ranked.length ? "" : '<p class="empty">Nog te weinig potten gespeeld voor een MVP-lijst.</p>'}`;
};

clubViews.spelers = () => {
  const card = (title, rows, line) => `<div class="card"><h3>${title}</h3>${rows.length ? `<table><tbody>${rows.map((r, i) => `<tr><td class="n">${i + 1}</td><td>${cPl(r.id)}<div class="mute small">${memberTeams(C.members.find((m) => m.id === r.id))}</div></td><td class="n bold">${line(r)}</td></tr>`).join("")}</tbody></table>` : '<p class="mute small">Nog te weinig partijen (minimaal 3).</p>'}</div>`;
  const dn = C.meta.discNames;
  const pctLine = (r) => `${pct(r.w / r.n)} <span class="mute small">${r.w}/${r.n}</span>`;
  const topCls = Object.entries(C.classTop).map(([k, rows]) => {
    const t = C.teams.find((x) => x.comp === k && x.found);
    return `<div class="card"><h3>Beste Infinity-spelers in de ${esc(t.compLabel)}</h3><table><tbody>${rows.map((r) => `<tr><td class="n">${r.pos}</td><td>${cPl(r.id)}<div class="mute small">${esc(r.team)}</div></td><td class="n small mute">plek ${r.pos} van ${r.of}</td></tr>`).join("")}</tbody></table></div>`;
  }).join("");
  const rt = C.members.filter((m) => m.rated).slice(0, 10);
  const rising = [...C.members].filter((m) => m.matches).sort((a, b) => b.delta - a.delta).slice(0, 5);
  return `<h1>Top spelers</h1><p class="mute">De beste spelers van Infinity per spelsoort, per klasse en op rating. Per spelsoort minimaal 3 gespeelde partijen.</p>
  <h2>Per spelsoort</h2><div class="grid g3">${["2", "3", "4", "5"].map((d) => card(dn[d], C.discTop[d], pctLine)).join("")}${card("Koppel", C.discTop.dbl, pctLine)}</div>
  <h2>Per klasse</h2><div class="grid g2">${topCls || '<p class="mute">Nog geen MVP-data.</p>'}</div>
  <h2>Rating &amp; vorm</h2><div class="grid g2">
    <div class="card"><h3>Hoogste rating</h3><table><tbody>${rt.map((m, i) => `<tr><td class="n">${i + 1}</td><td>${cPl(m.id)}<div class="mute small">${memberTeams(m)}</div></td><td class="n bold">${m.rating}</td></tr>`).join("")}</tbody></table></div>
    <div class="card"><h3>Stijgers dit seizoen</h3><table><tbody>${rising.map((m, i) => `<tr><td class="n">${i + 1}</td><td>${cPl(m.id)}<div class="mute small">${memberTeams(m)}</div></td><td class="n bold ${m.delta >= 0 ? "win" : "lose"}">${sgn(m.delta)}</td></tr>`).join("")}</tbody></table></div>
  </div>
  <h2>Alle spelers</h2><div class="card tw"><table class="sortable"><thead><tr><th data-s>Speler</th><th data-s>Team</th><th class="n" data-s>Rating</th><th class="n" data-s>Partijen</th><th class="n" data-s>Winst%</th><th class="n hide-s" data-s>Seizoen ±</th></tr></thead><tbody>
  ${C.members.map((m) => `<tr><td>${cPl(m.id)}</td><td class="small">${memberTeams(m)}</td><td class="n bold">${m.rating}</td><td class="n">${m.n}</td><td class="n" data-v="${m.n ? m.w / m.n : -1}">${m.n ? pct(m.w / m.n) : "–"}</td><td class="n hide-s ${m.delta >= 0 ? "win" : "lose"}">${sgn(m.delta)}</td></tr>`).join("")}</tbody></table></div>`;
};

clubViews.weetjes = () => {
  const duels = C.derbies.map((d) => `<tr><td class="small">${esc(d.home)} – ${esc(d.away)}</td><td class="nowrap small">${dtl.format(new Date(d.start))}</td><td class="n bold">${d.done ? `${d.sa} – ${d.sb}` : "nog te spelen"}</td></tr>`).join("");
  return `<h1>Weetjes</h1><p class="mute">Interessante feiten over de Infinity-teams en -spelers.</p>
  <div class="grid g2">${C.facts.map((f) => `<div class="tip ${f.bad ? "bad" : ""}"><span class="ic">${f.ic}</span><div><b>${esc(f.title)}</b><br><span class="mute">${esc(f.text)}</span></div></div>`).join("") || '<p class="mute">Nog te weinig data.</p>'}</div>
  ${duels ? `<h2>Onderlinge duels</h2><div class="card tw"><table><tbody>${duels}</tbody></table></div>` : ""}`;
};

clubViews.toernooien = () => {
  const link = (t) => `https://cuescore.com/tournament/${t.slug}/${t.id}`;
  const state = (t) => (t.status === "Upcoming" ? ["Binnenkort", "green"] : t.status === "Active" ? ["Bezig", "green"] : ["Afgelopen", ""]);
  const coming = C.tournaments.filter((t) => t.status === "Upcoming" || t.status === "Active").sort((a, b) => a.start.localeCompare(b.start));
  const past = C.tournaments.filter((t) => !coming.includes(t));
  const row = (t) => { const [s, c] = state(t); return `<tr><td><a href="${link(t)}" target="_blank" rel="noopener">${esc(t.name)}</a></td><td class="nowrap small">${t.start ? dtl.format(new Date(t.start)) : ""}</td><td class="small hide-s">${esc(t.discipline || "")}</td><td class="n small hide-s">${t.players || ""}</td><td><span class="pill ${c}">${s}</span></td></tr>`; };
  const head = '<thead><tr><th>Toernooi</th><th>Datum</th><th class="hide-s">Spel</th><th class="n hide-s">Spelers</th><th></th></tr></thead>';
  const kinds = [...new Set(past.map((t) => t.kind))];
  return `<h1>Toernooien bij Infinity</h1><p class="mute">Toernooien die op CueScore bij Poolcafe Infinity in Wageningen staan. <a href="${esc(C.meta.venueUrl)}/tournaments" target="_blank" rel="noopener">Alle toernooien op CueScore ↗</a></p>
  <h2>Gepland &amp; bezig</h2>${coming.length ? `<div class="card tw"><table>${head}<tbody>${coming.map(row).join("")}</tbody></table></div>` : '<p class="mute">Geen toernooien gepland.</p>'}
  ${kinds.map((k) => `<h2>${esc(k === "Overig" ? "Overige toernooien" : k === "NK" ? "NK-toernooien (eerdere edities)" : k)}</h2><div class="card tw"><table>${head}<tbody>${past.filter((t) => t.kind === k).map(row).join("")}</tbody></table></div>`).join("")}`;
};

clubViews.lucky9 = () => {
  const ev = (C.lucky9.avonden || []).slice().sort((a, b) => b.datum.localeCompare(a.datum));
  if (!ev.length) return `<h1>Lucky 9</h1><div class="placeholder">De uitslagen van de Lucky 9-avonden komen hier te staan zodra ze zijn aangeleverd.<br><span class="small">Per avond: datum en de einduitslag (plaats, speler, punten). Daaruit maakt de site de avond-uitslag en een totaalklassement.</span></div>`;
  const tot = {};
  for (const a of ev) for (const r of a.uitslag) { const t = (tot[r.naam] ||= { naam: r.naam, avonden: 0, punten: 0, winst: 0 }); t.avonden++; t.punten += r.punten || 0; t.winst += r.plaats === 1 ? 1 : 0; }
  const rows = Object.values(tot).sort((a, b) => b.punten - a.punten || b.winst - a.winst);
  return `<h1>Lucky 9</h1>
  <div class="card tw"><h3>Totaalklassement</h3><table><thead><tr><th class="n">#</th><th>Speler</th><th class="n">Avonden</th><th class="n">Winst</th><th class="n">Punten</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td class="n">${i + 1}</td><td>${esc(r.naam)}</td><td class="n">${r.avonden}</td><td class="n">${r.winst}</td><td class="n bold">${r.punten}</td></tr>`).join("")}</tbody></table></div>
  ${ev.map((a) => `<div class="card tw" style="margin-top:16px"><h3>${dtl.format(new Date(a.datum))}</h3><table><tbody>${a.uitslag.map((r) => `<tr><td class="n">${r.plaats}</td><td>${esc(r.naam)}</td><td class="n">${r.punten ?? ""}</td></tr>`).join("")}</tbody></table></div>`).join("")}`;
};
