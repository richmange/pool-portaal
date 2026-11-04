// Scorebord voor straight pool (14.1 continuous). Draait volledig in de browser; de stand blijft bewaard in localStorage.
// Na elke beurt geef je aan hoeveel ballen er op tafel liggen; de punten volgen uit het verschil met de vorige stand.
window.SCOREBORD = (() => {
  const KEY = "sp-state-v1", NAMES = "sp-names-v1";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLORS = ["", "#f2c200", "#1c4fd6", "#d62828", "#6a1fb0", "#f26b0f", "#14803c", "#7a1a1a", "#161616"];
  const REASONS = [["gemist", "Gemist"], ["safety", "Safety"], ["foul", "Foul −1"], ["open", "Openingsfoul −2"]];
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  let S = store.get(KEY);        // lopende partij (of null)
  let pk = null, why = "gemist", rebreak = false, rr = false; // keuze die nog niet is bevestigd
  let root = null, wake = null;

  const fresh = (names, target, first) => ({
    names, target, turn: first, first, n: 15, run: 0, breakNext: true,
    score: [0, 0], pots: [0, 0], visits: [0, 0], hr: [0, 0], fouls: [0, 0], safes: [0, 0], cf: [0, 0],
    log: [], over: false, winner: null, hist: [], t0: Date.now(),
  });
  const save = () => store.set(KEY, S);
  const snap = () => { const { hist, ...rest } = S; S.hist.push(JSON.stringify(rest)); if (S.hist.length > 300) S.hist.shift(); };
  const nm = (i) => S.names[i];

  // ------------------------------------------------------------ spellogica
  // Wat gebeurt er als de huidige speler z'n beurt afsluit met k ballen op tafel en reden `w`?
  function preview(k, w, rb, rack) {
    const t = S.turn, pts = rack || k > S.n ? S.n - 1 + (15 - k) : S.n - k; // met nieuw rack: eerst tot 1 bal, daarna vanaf 15
    const pen = w === "foul" ? 1 : w === "open" ? 2 : 0;
    let extra = 0, rerack = false, same = false;
    if (w === "gemist" && k === 1 && !rack) { rerack = true; same = true; }
    else if (k === 1) rerack = true;
    if (rack) rerack = true;
    if (w === "foul") {
      const cf = (pts > 0 ? 0 : S.cf[t]) + 1;
      if (cf === 3) { extra = 15; rerack = true; same = true; }
    }
    if (w === "open" && rb) { rerack = true; same = true; }
    const total = S.score[t] + pts - pen - extra;
    return { pts, pen, extra, rerack, same, win: S.score[t] + pts >= S.target, total };
  }

  function commit(k, w, rb, rack) {
    rack = rack || k > S.n;
    if (S.over || k < (rack ? 2 : 1) || k > 15) return;
    const t = S.turn, o = 1 - t, p = preview(k, w, rb, rack);
    snap();
    S.score[t] += p.pts; S.pots[t] += p.pts; S.run += p.pts;
    const base = { t, pts: p.pts, run: S.run, why: w };
    if (p.win) {
      S.hr[t] = Math.max(S.hr[t], S.run); S.visits[t]++;
      S.over = true; S.winner = t; S.run = 0;
      S.log.push({ ...base, txt: `${nm(t)} +${p.pts} en wint de partij` });
      return finish();
    }
    if (w === "gemist" && k === 1 && !rack) { // veertien ballen gepot: opnieuw racken, dezelfde speler speelt door
      S.n = 15; S.breakNext = false;
      S.log.push({ ...base, txt: `${nm(t)} +${p.pts} — rack leeg, nieuw rack, ${nm(t)} speelt door` });
      return finish();
    }
    S.hr[t] = Math.max(S.hr[t], S.run); S.visits[t]++;
    let next = o, newN = k === 1 ? 15 : k, txt = `${nm(t)} ${p.pts > 0 ? "+" + p.pts : "0"}${rack ? " (incl. nieuw rack)" : ""}`;
    S.breakNext = false;
    if (w === "safety") { S.safes[t]++; txt += " · safety"; }
    else if (w === "foul" || w === "open") {
      S.fouls[t]++; S.score[t] -= p.pen; txt += ` · foul −${p.pen}`;
      if (w === "foul") {
        if (p.pts > 0) S.cf[t] = 0;
        S.cf[t]++;
        if (S.cf[t] === 3) {
          S.score[t] -= 15; S.cf[t] = 0; newN = 15; next = t; S.breakNext = true;
          txt += " · 3e foul op rij: −15 extra, alles opnieuw gerackt, zelfde speler breekt";
        }
      } else if (rb) { newN = 15; next = t; S.breakNext = true; txt += " · tegenstander eist re-break"; }
    } else { S.cf[t] = 0; txt += " · gemist"; }
    if (w === "safety") S.cf[t] = 0;
    S.run = 0; S.turn = next; S.n = newN;
    S.log.push({ ...base, txt });
    finish();
  }

  function finish() { pk = null; why = "gemist"; rebreak = false; rr = false; save(); paint(); try { navigator.vibrate && navigator.vibrate(15); } catch (e) {} }
  function undo() {
    const last = S.hist.pop();
    if (!last) return;
    const hist = S.hist; S = JSON.parse(last); S.hist = hist; pk = null; why = "gemist"; rebreak = false; rr = false; save(); paint();
  }
  function startGame() {
    const n0 = root.querySelector("#sb-n0").value.trim() || "Speler 1", n1 = root.querySelector("#sb-n1").value.trim() || "Speler 2";
    const tgt = Math.max(5, parseInt(root.querySelector("#sb-t").value, 10) || 40);
    let f = root.querySelector("#sb-f").value; f = f === "r" ? Math.round(Math.random()) : Number(f);
    store.set(NAMES, [n0, n1]);
    S = fresh([n0, n1], tgt, f); pk = null; why = "gemist"; rebreak = false; rr = false; save(); paint();
  }
  function newGame() { S = null; store.set(KEY, null); pk = null; paint(); }
  function rematch() { S = fresh(S.names.slice(), S.target, 1 - S.first); pk = null; rr = false; why = "gemist"; save(); paint(); }

  // ------------------------------------------------------------ scherm
  const ballEl = (k, attrs = "", cls = "") => `<button type="button" class="sb-ball ${k > 8 ? "stripe" : ""} ${cls}" style="--c:${COLORS[k > 8 ? k - 8 : k]}" ${attrs}><i>${k}</i></button>`;
  const fmt1 = (x) => (Number.isFinite(x) ? x.toFixed(1).replace(".", ",") : "–");

  function setup() {
    const last = store.get(NAMES) || ["", ""];
    return `<h1>Scorebord <small>straight pool</small></h1>
    <p class="mute">Registreer een partij 14.1: na elke beurt tik je hoeveel ballen er nog op tafel liggen, het scorebord rekent de punten uit. Fouls, safeties en een nieuw rack gaan vanzelf goed. De stand blijft bewaard, ook als je de pagina sluit.</p>
    <div class="card sb-setup">
      <label>Speler 1<input id="sb-n0" maxlength="24" placeholder="Naam" value="${esc(last[0])}" autocomplete="off"></label>
      <label>Speler 2<input id="sb-n1" maxlength="24" placeholder="Naam" value="${esc(last[1])}" autocomplete="off"></label>
      <label>Race tot<select id="sb-t">${[25, 30, 40, 50, 75, 100].map((v) => `<option value="${v}" ${v === 40 ? "selected" : ""}>${v} punten</option>`).join("")}</select></label>
      <label>Wie breekt?<select id="sb-f"><option value="0">Speler 1</option><option value="1">Speler 2</option><option value="r">🎲 Loten</option></select></label>
      <button type="button" class="btn primary sb-go" data-a="start">Start de partij</button>
    </div>`;
  }

  const rackMini = (n) => `<div class="sb-rack" aria-label="${n} ballen op tafel">${[1, 2, 3, 4, 5].map((r) => `<div>${Array.from({ length: r }, (_, i) => { const idx = (r * (r - 1)) / 2 + i; return `<b class="${idx < n ? "on" : ""}"></b>`; }).join("")}</div>`).join("")}</div>`;

  function playerCard(i) {
    const act = S.turn === i && !S.over, win = S.over && S.winner === i;
    const pct = Math.max(0, Math.min(100, (S.score[i] / S.target) * 100));
    return `<div class="sb-player ${act ? "act" : ""} ${win ? "win" : ""}" ${!S.over && !act ? `data-a="turn" data-p="${i}" title="Tik om de beurt hierheen te zetten"` : ""}>
      <div class="sb-name">${win ? "🏆 " : act ? "🎱 " : ""}${esc(nm(i))}</div>
      <div class="sb-score">${S.score[i]}</div>
      <div class="sb-bar"><span style="width:${pct}%"></span></div>
      ${act && S.run > 0 ? `<div class="sb-run">serie +${S.run}</div>` : ""}
      <div class="sb-stats"><span>Beurten <b>${S.visits[i]}</b></span><span>Gem. <b>${fmt1(S.visits[i] ? S.pots[i] / S.visits[i] : NaN)}</b></span><span>HS <b>${Math.max(S.hr[i], act ? S.run : 0)}</b></span><span>Fouls <b>${S.fouls[i]}</b></span><span>Safeties <b>${S.safes[i]}</b></span></div>
      ${S.cf[i] ? `<div class="sb-warn">${"●".repeat(S.cf[i])}${"○".repeat(3 - S.cf[i])} fouls op rij${S.cf[i] === 2 ? " — de volgende foul kost 16 punten!" : ""}</div>` : ""}
    </div>`;
  }

  function controls() {
    const t = S.turn, rack = rr || (pk != null && pk > S.n), p = pk != null ? preview(pk, why, rebreak, rack) : null;
    let sum = "";
    if (p) {
      const parts = [`<b>${esc(nm(t))}</b>: ${p.pts > 0 ? `+${p.pts} punten` : "geen punten"}`];
      if (p.pen) parts.push(`foul −${p.pen}`);
      if (p.extra) parts.push(`3e foul op rij: −${p.extra} extra`);
      sum = `<div class="sb-sum">${parts.join(" · ")} → score <b>${p.total}</b>${p.win ? " 🏁 wint de partij" : p.same ? ` <span class="mute">· ${esc(nm(t))} blijft aan tafel${p.rerack ? ", nieuw rack" : ""}</span>` : p.rerack ? ' <span class="mute">· nieuw rack</span>' : ` <span class="mute">· beurt naar ${esc(nm(1 - t))}</span>`}</div>`;
    }
    const balls = Array.from({ length: 15 }, (_, i) => i + 1).map((k) => ballEl(k, `data-a="ball" data-k="${k}" ${rack && k === 1 ? "disabled" : ""}`, `${pk === k ? "sel" : ""} ${k === S.n ? "same" : ""} ${k > S.n ? "newrack" : ""}`)).join("");
    return `<div class="card sb-table">
      <div class="sb-tablehead">${rackMini(S.n)}<div><div class="sb-q">Hoeveel ballen liggen er <u>nu</u> op tafel?</div>
        <div class="mute small">Er lagen ${S.n} ballen${S.breakNext ? " (openingsbreak)" : ""}. Is er één bal over, tik dan <b>1</b>: er komt een nieuw rack en ${esc(nm(t))} speelt door. Ook al een paar ballen van het nieuwe rack gepot? Tik dan een aantal hoger dan ${S.n} (of vink "nieuw rack" aan): de punten van beide racks worden opgeteld. Op een foul of safety gespotte ballen tel je gewoon mee.</div></div></div>
      <div class="sb-reasons">${REASONS.map(([k, l]) => `<button type="button" class="sb-chip ${why === k ? "on" : ""}" data-a="why" data-w="${k}">${l}</button>`).join("")}</div>
      ${why === "open" ? `<label class="sb-check"><input type="checkbox" data-a="rb" ${rebreak ? "checked" : ""}> Tegenstander eist een re-break (zelfde speler breekt opnieuw)</label>` : ""}
      <label class="sb-check"><input type="checkbox" data-a="rr" ${rack ? "checked" : ""} ${pk != null && pk > S.n ? "disabled" : ""}> Er kwam een nieuw rack tijdens deze beurt (ballen tellen daarna weer vanaf 15)</label>
      <div class="sb-balls">${balls}</div>
      ${sum}
      <div class="sb-actions">
        <button type="button" class="btn primary sb-ok" data-a="ok" ${pk == null ? "disabled" : ""}>Bevestig beurt</button>
        <button type="button" class="btn" data-a="skip" title="Beurt zonder punten: de andere speler is aan de beurt">Wissel speler (0 punten)</button>
        <button type="button" class="btn" data-a="undo" ${S.hist.length ? "" : "disabled"}>↶ Ongedaan maken</button>
      </div>
    </div>`;
  }

  function summary() {
    const w = S.winner, l = 1 - w;
    const row = (lab, f) => `<tr><td>${lab}</td><td class="n">${f(0)}</td><td class="n">${f(1)}</td></tr>`;
    return `<div class="card sb-over"><h2>🏆 ${esc(nm(w))} wint met ${S.score[w]} – ${S.score[l]}</h2>
      <table><thead><tr><th></th><th class="n">${esc(nm(0))}</th><th class="n">${esc(nm(1))}</th></tr></thead><tbody>
        ${row("Score", (i) => S.score[i])}${row("Beurten", (i) => S.visits[i])}${row("Gemiddelde per beurt", (i) => fmt1(S.visits[i] ? S.pots[i] / S.visits[i] : NaN))}${row("Hoogste serie", (i) => S.hr[i])}${row("Fouls", (i) => S.fouls[i])}${row("Safeties", (i) => S.safes[i])}
      </tbody></table>
      <div class="sb-actions"><button type="button" class="btn primary" data-a="rematch">Revanche (${esc(nm(1 - S.first))} breekt)</button><button type="button" class="btn" data-a="share">Uitslag kopiëren</button><button type="button" class="btn" data-a="undo">↶ Laatste beurt terug</button><button type="button" class="btn" data-a="new">Nieuwe partij</button></div></div>`;
  }

  function logHtml() {
    if (!S.log.length) return "";
    const items = S.log.map((e, i) => `<li><span class="mute">${i + 1}.</span> ${esc(e.txt)}</li>`).reverse();
    return `<div class="card sb-log"><h3>Verloop</h3><ol reversed class="small">${items.slice(0, 5).join("")}</ol>${items.length > 5 ? `<details><summary class="small mute">Alle ${items.length} beurten</summary><ol reversed class="small">${items.join("")}</ol></details>` : ""}</div>`;
  }

  function game() {
    return `<h1>Scorebord <small>race tot ${S.target}</small></h1>
    <div class="sb-top mute small"><span>${S.over ? "Partij afgelopen" : `${esc(nm(S.turn))} is aan tafel`} · beurt ${S.visits[0] + S.visits[1] + (S.over ? 0 : 1)}</span>
      <span>${wake ? "💡 scherm blijft aan" : ""} <button type="button" class="btn small" data-a="new" data-confirm="1">Nieuwe partij</button></span></div>
    <div class="sb-players">${playerCard(0)}${playerCard(1)}</div>
    ${S.over ? summary() : controls()}
    ${logHtml()}`;
  }

  function paint() {
    if (!root) return;
    root.innerHTML = S ? game() : setup();
    keepAwake(!!S && !S.over);
  }

  // ------------------------------------------------------------ scherm aan houden
  async function keepAwake(on) {
    try {
      if (on && !wake && "wakeLock" in navigator) {
        wake = await navigator.wakeLock.request("screen");
        wake.addEventListener("release", () => { wake = null; });
        const h = root.querySelector(".sb-top span:last-child"); if (h && !h.textContent.includes("💡")) h.insertAdjacentText("afterbegin", "💡 scherm blijft aan ");
      } else if (!on && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && root && root.isConnected && S && !S.over) keepAwake(true); });

  // ------------------------------------------------------------ events
  function onClick(e) {
    const b = e.target.closest("[data-a]");
    if (!b || b.disabled || (b.tagName === "INPUT")) return;
    const a = b.dataset.a;
    if (a === "start") startGame();
    else if (a === "ball") { pk = pk === Number(b.dataset.k) ? null : Number(b.dataset.k); paint(); }
    else if (a === "why") { why = b.dataset.w; if (why !== "open") rebreak = false; paint(); }
    else if (a === "ok") { if (pk != null) commit(pk, why, rebreak, rr || pk > S.n); }
    else if (a === "skip") commit(S.n, "gemist", false);
    else if (a === "undo") undo();
    else if (a === "turn") { snap(); S.turn = Number(b.dataset.p); S.run = 0; S.log.push({ t: S.turn, pts: 0, why: "wissel", txt: `Beurt gezet op ${nm(S.turn)} (correctie)` }); save(); paint(); }
    else if (a === "rematch") rematch();
    else if (a === "new") { if (!S.over && b.dataset.confirm && !confirm("Deze partij verwijderen en opnieuw beginnen?")) return; newGame(); }
    else if (a === "share") share();
  }
  function onChange(e) { const a = e.target.dataset.a; if (a === "rb") { rebreak = e.target.checked; paint(); } else if (a === "rr") { rr = e.target.checked; if (pk === 1 && rr) pk = null; paint(); } }
  function share() {
    const w = S.winner, l = 1 - w;
    const txt = `Straight pool tot ${S.target}: ${S.names[0]} ${S.score[0]} – ${S.score[1]} ${S.names[1]} (${S.visits[0] + S.visits[1]} beurten, hoogste serie ${S.hr[0]}/${S.hr[1]}). ${S.names[w]} wint! — poolinfo.nl`;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => alert("Uitslag gekopieerd."), () => prompt("Kopieer de uitslag:", txt));
  }

  function mount(el) {
    root = el; root.className = "sb";
    root.onclick = onClick; root.onchange = onChange;
    paint();
  }
  const release = () => { root = null; if (wake) { try { wake.release(); } catch (e) {} wake = null; } };
  return { mount, release };
})();
