"""Zet de ruwe CueScore-data om naar site/data/data.json (statistieken, ratings, voorspellingen).

Model in het kort (staat ook uitgelegd op de pagina 'Hoe werkt het?'):
  - KNBB-rating is een Elo-rating (schaal 400, K=20): kans speler A wint = 1/(1+10^((Rb-Ra)/400)).
  - Per spelsoort corrigeren we de rating met de gekrompen winstrate van de speler in die spelsoort.
  - Een teamwedstrijd = 6 partijen (dubbel 10-ball, 8-ball, straight pool, 8-ball, 9-ball, 10-ball).
    Wie er speelt is onbekend: per partij wegen we spelers naar hoe vaak ze die spelsoort speelden.
  - De verdeling van het aantal gewonnen partijen volgt exact uit convolutie van de 6 partijkansen.
  - Titel/degradatie: Monte-Carlo simulatie van alle nog te spelen wedstrijden.
"""
import html as htmlmod
import json
import random
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "site" / "data"
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))

DISC = {1: "7-ball", 2: "8-ball", 3: "9-ball", 4: "10-ball", 5: "Straight pool", 10: "Multiball"}
SLOTS = [(4, 2), (2, 0), (5, 0), (2, 0), (3, 0), (4, 0)]  # (spelsoort, type 2=dubbel) volgens CueScore-setup
SIMS = 20000
PAST_W = 0.5      # gewicht van partijen uit eerdere seizoenen in de spelsoort-correctie
SLOT_PAST_W = 0.3  # idem voor opstelling-gewichten
MIN_TOP = 3  # minimaal aantal partijen per spelsoort (en koppel) voor de top 10-lijsten
MIN_MVP = 5  # minimaal aantal gespeelde potten voor de MVP top 10
K_SHIFT = 120  # ratingpunten per 100% winstrate-verschil t.o.v. eigen gemiddelde


def unesc(s):
    return htmlmod.unescape(htmlmod.unescape(s)).strip()


def elo(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))


# ----------------------------------------------------------------------------- parsers
def parse_details(h):
    games = []
    parts = re.split(r'(?=<tr id="match-\d+" class="match )', h)
    for p in parts:
        m = re.match(r'<tr id="match-(\d+)" class="match[^"]*"\s+data-parent-id="(\d+)" data-discipline="(\d+)" '
                     r'data-match-type="(\d+)" data-race-to="(\d+)" data-matchno="(\d+)" data-starttime="([^"]*)"', p)
        if not m:
            continue
        names = re.findall(r'<div class="name\s*(?:loser)?\s*">([^<]*)</div>', p)
        sa = re.search(r'class="scoreA[^"]*"><div class="scoreboard"><input[^>]*value="(\d+)"', p)
        sb = re.search(r'class="scoreB[^"]*"><div class="scoreboard"><input[^>]*value="(\d+)"', p)
        if len(names) < 2 or not sa or not sb:
            continue
        games.append({
            "id": int(m.group(1)), "parent": int(m.group(2)), "d": int(m.group(3)), "t": int(m.group(4)),
            "r": int(m.group(5)), "n": int(m.group(6)), "start": m.group(7),
            "a": unesc(names[0]), "b": unesc(names[1]), "sa": int(sa.group(1)), "sb": int(sb.group(1)),
        })
    return games


def parse_mvp(h):
    """MVP-tabel van CueScore, in CueScore-volgorde. Spelers onder 60% deelname hebben geen positie (valid=False)."""
    rows = []
    for r in re.split(r"<tr>\s*<td class=\"position\">", h)[1:]:
        r = r.split("</tr>")[0]
        m = re.search(r'href="//cuescore\.com/player/([^/]+)/(\d+)">([^<]*)</a>', r)
        t = re.search(r'href="//cuescore\.com/team/[^/]+/(\d+)">', r)
        if not m or not t:
            continue
        pos = re.match(r"\s*(\d+)", r)
        cells = [c.strip() for c in re.findall(r"<td[^>]*>([^<]*)</td>", r)]
        num = lambda x: int(x) if x.isdigit() else 0
        pct = lambda x: float(x.rstrip("%")) if x.rstrip("%").replace(".", "", 1).isdigit() else None
        # cellen: scheiding, MVP, scheiding, 8-ball(4), sch, straight(4), sch, 9-ball(4), sch, 10-ball(4), sch, MP, PR
        blok = lambda i: [num(c) for c in cells[i:i + 4]]
        ok = len(cells) >= 25
        rows.append({"pos": int(pos.group(1)) if pos else None, "id": int(m.group(2)), "name": unesc(m.group(3)), "team": int(t.group(1)),
                     "mvp": pct(cells[1]) if ok else None,
                     "mp": num(cells[23]) if ok else 0, "pr": pct(cells[24]) if ok else None,
                     "d": {"2": blok(3), "5": blok(8), "3": blok(13), "4": blok(18)} if ok else {}})
    return rows


def parse_rating_page(h):
    out = {"rating": None, "matches": 0, "wins": 0, "losses": 0, "hist": []}
    m = re.search(r'<div class="matches">\s*<div><span class="bold">(\d+)</span>', h)
    if m:
        out["matches"] = int(m.group(1))
    m = re.search(r'class="wins">(\d+)<', h)
    out["wins"] = int(m.group(1)) if m else 0
    m = re.search(r'class="losses">(\d+)<', h)
    out["losses"] = int(m.group(1)) if m else 0
    m = re.search(r'ratingHex">\s*<div[^>]*>Rating</div>\s*<div>(\d+)</div>', h)
    out["rating"] = int(m.group(1)) if m else None
    tour = None
    body = h[h.find('<table class="ratingTable'):]
    for tr in re.findall(r"<tr>(.*?)</tr>", body, flags=re.S):
        tm = re.search(r'class="tournament"[^>]*><a[^>]*href="[^"]*/(\d+)">([^<]*)</a>', tr)
        if tm:
            tour = {"id": int(tm.group(1)), "name": unesc(tm.group(2))}
            continue
        om = re.search(r'<td class="player">\s*<a[^>]*playerId=(\d+)">([^<]*)</a>', tr)
        if not om or not tour:
            continue
        orat = re.search(r'class="opponentrating"[^>]*>(\d+|-)<', tr)
        date = re.search(r'class="center matchdate">(\d+)/(\d+)/(\d+)<', tr)
        spans = re.findall(r'<span class="(winner )?">?(\d+)</span>', tr)
        sc = re.search(r'class="center score"><a[^>]*#match-(\d+)"><span class="([^"]*)">(\d+)</span> - <span class="([^"]*)">(\d+)</span>', tr)
        dl = re.search(r'<td class="center (?:positive|negative)?">?\s*(-?\d+)</td>', tr)
        after = re.search(r'<td class="center rating"[^>]*>(\d+)</td>', tr)
        if not (date and sc and after):
            continue
        mo, da, yr = (int(x) for x in date.groups())
        out["hist"].append({
            "t": tour["id"], "tn": tour["name"], "date": f"{2000 + yr:04d}-{mo:02d}-{da:02d}",
            "opp": int(om.group(1)), "oppName": unesc(om.group(2)),
            "oppR": int(orat.group(1)) if orat and orat.group(1) != "-" else None,
            "m": int(sc.group(1)), "s": int(sc.group(3)), "o": int(sc.group(5)),
            "win": "winner" in sc.group(2), "delta": int(dl.group(1)) if dl else 0, "r": int(after.group(1)),
        })
    return out


# ----------------------------------------------------------------------------- hoofdbouw
def load_season(season):
    d = RAW / "seasons" / str(season["id"])
    t = json.loads((d / "tournament.json").read_text(encoding="utf-8"))
    mvp = parse_mvp((d / "mvp.html").read_text(encoding="utf-8")) if (d / "mvp.html").exists() else []
    details = {}
    for f in (d / "details").glob("*.html"):
        details[int(f.stem)] = parse_details(f.read_text(encoding="utf-8"))
    return t, mvp, details


def team_dist(ps):
    """ps = kansen per partij dat team A wint -> verdeling aantal gewonnen partijen."""
    dist = [1.0]
    for p in ps:
        nd = [0.0] * (len(dist) + 1)
        for k, v in enumerate(dist):
            nd[k] += v * (1 - p)
            nd[k + 1] += v * p
        dist = nd
    return dist


def assemble(season):
    """Teams, spelers en wedstrijden (met partijdetails) van één seizoen."""
    t, mvp_rows, details = load_season(season)
    standings = t["standings"]["1"]
    # ---- teams
    teams = {}
    for s in standings:
        p = s["player"]
        teams[p["teamId"]] = {"id": p["teamId"], "name": p["name"], "venue": p.get("venue", {}).get("name", ""),
                              "image": p.get("image", ""), "players": []}
    # ---- spelers
    players = {}
    for r in mvp_rows:
        players[r["id"]] = {"id": r["id"], "name": r["name"], "team": r["team"], "mvp": r["mvp"], "pr": r["pr"]}
        if r["team"] in teams:
            teams[r["team"]]["players"].append(r["id"])

    def find_player(name, team_id):
        for pid in teams.get(team_id, {}).get("players", []):
            if players[pid]["name"].lower() == name.lower():
                return pid
        for pid, p in players.items():
            if p["name"].lower() == name.lower():
                return pid
        return None

    def find_initial(token, team_id):
        m = re.match(r"([A-Za-z])\.\s*(.+)", token.strip())
        if not m:
            return find_player(token, team_id)
        ini, sur = m.group(1).lower(), m.group(2).lower().strip()
        for pid in teams.get(team_id, {}).get("players", []):
            n = players[pid]["name"].lower()
            if n.startswith(ini) and n.endswith(sur):
                return pid
        return None

    def resolve(name, team_id, double):
        if double:
            return [find_initial(x, team_id) or x for x in name.split(" & ")]
        return [find_player(name, team_id) or name]

    # ---- wedstrijden
    matches = []
    for m in t["matches"]:
        home, away = m["playerA"]["teamId"], m["playerB"]["teamId"]
        mm = {"id": m["matchId"], "no": m["matchno"], "round": m["round"], "start": m["starttime"],
              "home": home, "away": away, "venue": m["playerA"].get("venue", {}).get("name", ""),
              "status": m["matchstatus"], "sa": m["scoreA"], "sb": m["scoreB"], "games": []}
        for g in sorted(details.get(m["matchId"], []), key=lambda x: x["n"]):
            dbl = g["t"] == 2
            mm["games"].append({"n": g["n"], "d": g["d"], "dbl": dbl, "r": g["r"],
                                "a": resolve(g["a"], home, dbl), "b": resolve(g["b"], away, dbl),
                                "sa": g["sa"], "sb": g["sb"], "start": g["start"]})
        matches.append(mm)
    matches.sort(key=lambda x: (x["round"], x["no"]))
    return t, teams, players, matches, mvp_rows


def main():
    season = next(s for s in CONFIG["seasons"] if s.get("current"))
    t, teams, players, matches, mvp_rows = assemble(season)
    standings = t["standings"]["1"]

    # ---- ratingpagina's
    hist = {}
    for pid, p in players.items():
        f = RAW / "rating_players" / f"{pid}.html"
        if f.exists():
            hist[pid] = parse_rating_page(f.read_text(encoding="utf-8"))
    known = {pid: p["name"] for pid, p in players.items()}
    for pid, h in hist.items():
        for r in h["hist"]:
            known.setdefault(r["opp"], r["oppName"])
    ratings = [h["rating"] for h in hist.values() if h["rating"]]
    mean_rating = round(sum(ratings) / len(ratings)) if ratings else 1000

    # ---- statistieken uit individuele partijen (huidig seizoen)
    st = defaultdict(lambda: {"d": defaultdict(lambda: [0, 0, 0, 0]), "dbl": [0, 0, 0, 0], "slots": defaultdict(int)})
    # per speler per spelsoort: [gespeeld, gewonnen, voor, tegen]
    h2h = defaultdict(lambda: [0, 0])
    for mm in matches:
        for g in mm["games"]:
            for side, (mine, other, ms, os_) in enumerate([(g["a"], g["b"], g["sa"], g["sb"]), (g["b"], g["a"], g["sb"], g["sa"])]):
                won = ms > os_
                for pid in mine:
                    if not isinstance(pid, int):
                        continue
                    rec = st[pid]["dbl"] if g["dbl"] else st[pid]["d"][g["d"]]
                    rec[0] += 1
                    rec[1] += won
                    rec[2] += ms
                    rec[3] += os_
                    st[pid]["slots"][(g["d"], g["dbl"])] += 1
                    if not g["dbl"] and other and isinstance(other[0], int):
                        h2h[(pid, other[0])][0 if won else 1] += 1

    # ---- eerdere seizoenen: zelfde spelers (op ID) tellen mee met gewicht, plus historie-overzicht
    stp = defaultdict(lambda: {"d": defaultdict(lambda: [0, 0, 0, 0]), "dbl": [0, 0, 0, 0], "slots": defaultdict(int)})
    canon = {}
    for k, ids in CONFIG.get("teamAliases", {}).items():
        for i in ids:
            canon[i] = int(k)
    cid = lambda i: canon.get(i, i)
    history = {"seasons": [], "teamHist": defaultdict(list), "meetings": [], "teamNames": defaultdict(dict)}
    pseasons = defaultdict(dict)
    for sn in CONFIG["seasons"]:
        if sn.get("current"):
            ts, tms, pls, mts, mvr = t, teams, players, matches, mvp_rows
        else:
            if not (RAW / "seasons" / str(sn["id"]) / "tournament.json").exists():
                continue
            ts, tms, pls, mts, mvr = assemble(sn)
            for mm in mts:
                for g in mm["games"]:
                    for mine, other, ms, os_ in ((g["a"], g["b"], g["sa"], g["sb"]), (g["b"], g["a"], g["sb"], g["sa"])):
                        for pid in mine:
                            if not isinstance(pid, int) or pid not in players:
                                continue
                            rec = stp[pid]["dbl"] if g["dbl"] else stp[pid]["d"][g["d"]]
                            rec[0] += 1; rec[1] += ms > os_; rec[2] += ms; rec[3] += os_
                            stp[pid]["slots"][(g["d"], g["dbl"])] += 1
                            ps = pseasons[pid].setdefault(sn["label"], {"team": cid(mm["home"] if pid in [x for gg in [g] for x in gg["a"]] else mm["away"]),
                                                                        "disc": {}, "dbl": [0, 0, 0, 0]})
                            r2 = ps["dbl"] if g["dbl"] else ps["disc"].setdefault(g["d"], [0, 0, 0, 0])
                            r2[0] += 1; r2[1] += ms > os_; r2[2] += ms; r2[3] += os_
        for pid, pp in pls.items():
            if sn.get("current") or pid in players:
                pseasons[pid].setdefault(sn["label"], {"team": cid(pp["team"]), "disc": {}, "dbl": [0, 0, 0, 0]})["mvp"] = pp["mvp"]
        rows = []
        for x in ts["standings"]["1"]:
            tid = x["player"]["teamId"]
            row = {"team": cid(tid), "name": x["player"]["name"], "pos": x["position"], "played": x["played"], "w": x["wins"], "d": x["ties"],
                   "l": x["losses"], "fw": x["frameWins"], "fl": x["frameLosses"], "pts": x["points"]}
            rows.append(row)
            history["teamHist"][cid(tid)].append({"label": sn["label"], **{k: row[k] for k in ("name", "pos", "pts", "played")}})
            history["teamNames"][cid(tid)][sn["label"]] = x["player"]["name"]
        history["seasons"].append({"label": sn["label"], "current": bool(sn.get("current")), "standings": sorted(rows, key=lambda r: r["pos"])})
        for mm in mts:
            if mm["status"] == "finished":
                history["meetings"].append({"s": sn["label"], "round": mm["round"], "start": mm["start"], "home": cid(mm["home"]),
                                            "away": cid(mm["away"]), "sa": mm["sa"], "sb": mm["sb"]})

    # ---- effectieve rating per spelsoort
    eff = {}
    for pid in players:
        base = hist.get(pid, {}).get("rating") or mean_rating
        comb = {d: [st[pid]["d"][d][0] + PAST_W * stp[pid]["d"][d][0], st[pid]["d"][d][1] + PAST_W * stp[pid]["d"][d][1]] for d in (2, 3, 4, 5)}
        W = sum(v[1] for v in comb.values())
        N = sum(v[0] for v in comb.values())
        wr_all = (W + 2) / (N + 4)
        e = {}
        for d in (2, 3, 4, 5):
            n, w = comb[d]
            wr_d = (w + 2 * wr_all) / (n + 2)
            e[d] = round(base + K_SHIFT * (wr_d - wr_all) * (n / (n + 3)) * 2)
        players[pid]["rating"] = base
        players[pid]["rated"] = bool(hist.get(pid, {}).get("rating"))
        players[pid]["eff"] = e

    # ---- lineup-gewichten per team per slot
    def weights(team_id, d, dbl):
        ids = teams[team_id]["players"]
        raw = {}
        for pid in ids:
            n_slot = st[pid]["slots"][(d, dbl)] + SLOT_PAST_W * stp[pid]["slots"][(d, dbl)]
            n_tot = sum(st[pid]["slots"].values()) + SLOT_PAST_W * sum(stp[pid]["slots"].values())
            raw[pid] = n_slot + 0.25 * n_tot + (0.05 if n_tot == 0 else 0)
        s = sum(raw.values()) or 1
        return {pid: v / s for pid, v in raw.items() if v > 0}

    wcache = {}

    def slot_prob(ta, tb, d, dbl):
        key = (ta, tb, d, dbl)
        if key in wcache:
            return wcache[key]
        wa, wb = weights(ta, d, dbl), weights(tb, d, dbl)
        if dbl:
            ra = sum(w * players[p]["eff"][4] for p, w in wa.items())
            rb = sum(w * players[p]["eff"][4] for p, w in wb.items())
            pr = elo(ra, rb)
        else:
            pr = sum(x * y * elo(players[a]["eff"][d], players[b]["eff"][d]) for a, x in wa.items() for b, y in wb.items())
        wcache[key] = pr
        return pr

    def match_dist(ta, tb):
        return team_dist([slot_prob(ta, tb, d, bool(dbl)) for d, dbl in SLOTS])

    def outcome(dist):
        win = sum(dist[4:]); draw = dist[3]; loss = sum(dist[:3])
        ef = sum(k * v for k, v in enumerate(dist))
        return {"win": win, "draw": draw, "loss": loss, "ef": ef, "dist": dist}

    mdist = {}
    for a in teams:
        for b in teams:
            if a != b:
                mdist[(a, b)] = match_dist(a, b)

    for mm in matches:
        o = outcome(mdist[(mm["home"], mm["away"])])
        mm["pred"] = {k: round(v, 4) if not isinstance(v, list) else [round(x, 4) for x in v] for k, v in o.items()}

    # ---- stand & Monte Carlo
    table = {}
    for s in standings:
        tid = s["player"]["teamId"]
        table[tid] = {"pos": s["position"], "played": s["played"], "w": s["wins"], "d": s["ties"], "l": s["losses"],
                      "fw": s["frameWins"], "fl": s["frameLosses"], "pts": s["points"]}
    remaining = [mm for mm in matches if mm["status"] != "finished"]
    rnd = random.Random(2026)
    ids = list(teams)
    n_teams = len(ids)
    pos_counts = {tid: [0] * n_teams for tid in ids}
    pts_sum = defaultdict(float)
    cum = {k: [sum(v[:i + 1]) for i in range(len(v))] for k, v in mdist.items()}
    for _ in range(SIMS):
        pts = {tid: table[tid]["pts"] for tid in ids}
        fw = {tid: table[tid]["fw"] for tid in ids}
        wins = {tid: table[tid]["w"] for tid in ids}
        for mm in remaining:
            c = cum[(mm["home"], mm["away"])]
            u = rnd.random()
            k = next(i for i, x in enumerate(c) if u <= x)
            a, b = mm["home"], mm["away"]
            pts[a] += k + (1 if k > 3 else 0)
            pts[b] += (6 - k) + (1 if k < 3 else 0)
            fw[a] += k; fw[b] += 6 - k
            wins[a] += k > 3; wins[b] += k < 3
        order = sorted(ids, key=lambda x: (pts[x], fw[x], wins[x], rnd.random()), reverse=True)
        for i, tid in enumerate(order):
            pos_counts[tid][i] += 1
            pts_sum[tid] += pts[tid]
    race = {}
    prom, rel = CONFIG["promotionSpots"], CONFIG["relegationSpots"]
    for tid in ids:
        pc = [c / SIMS for c in pos_counts[tid]]
        race[tid] = {"pos": [round(x, 4) for x in pc], "title": round(sum(pc[:prom]), 4),
                     "relegation": round(sum(pc[n_teams - rel:]), 4), "expPts": round(pts_sum[tid] / SIMS, 1),
                     "top3": round(sum(pc[:3]), 4)}

    # ---- vorm, teamstats
    def team_results(tid):
        res = []
        for mm in matches:
            if mm["status"] != "finished" or tid not in (mm["home"], mm["away"]):
                continue
            mine, theirs = (mm["sa"], mm["sb"]) if mm["home"] == tid else (mm["sb"], mm["sa"])
            res.append("W" if mine > theirs else "G" if mine == theirs else "V")
        return res

    league_disc = defaultdict(lambda: [0, 0])
    team_disc = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    for mm in matches:
        for g in mm["games"]:
            if g["dbl"]:
                continue
            for tid, won in ((mm["home"], g["sa"] > g["sb"]), (mm["away"], g["sb"] > g["sa"])):
                team_disc[tid][g["d"]][0] += 1
                team_disc[tid][g["d"]][1] += won
                league_disc[g["d"]][0] += 1
                league_disc[g["d"]][1] += won
    for tid, tm in teams.items():
        tm["table"] = table[tid]
        tm["form"] = team_results(tid)
        tm["disc"] = {str(d): v for d, v in team_disc[tid].items()}
        tm["race"] = race[tid]
        tm["w"] = {f"{d}{'d' if dbl else ''}": {str(k): round(v, 4) for k, v in weights(tid, d, bool(dbl)).items()}
                   for d, dbl in set(SLOTS)}
        tm["strength"] = round(sum(players[p]["rating"] for p in tm["players"]) / max(1, len(tm["players"])))

    # ---- spelers afronden
    for pid, p in players.items():
        s = st[pid]
        p["disc"] = {str(d): v for d, v in s["d"].items()}
        p["dbl"] = s["dbl"]
        p["slots"] = {f"{d}{'d' if dbl else ''}": n for (d, dbl), n in s["slots"].items()}
        h = hist.get(pid)
        p["hist"] = h["hist"] if h else []
        p["career"] = {"matches": h["matches"], "wins": h["wins"], "losses": h["losses"]} if h else None
        cur = [r for r in p["hist"] if r["t"] == season["id"]]
        p["season"] = {"matches": len(cur), "delta": sum(r["delta"] for r in cur)}
        # winstreak huidige reeks (nieuwste eerst in hist)
        streak = 0
        for r in p["hist"]:
            if r["win"]:
                streak += 1
            else:
                break
        p["streak"] = streak
        p["seasons"] = pseasons.get(pid, {})
        p["seasons"].setdefault(season["label"], {"team": cid(p["team"]), "mvp": p["mvp"]}).update(
            {"disc": p["disc"], "dbl": p["dbl"]})
        p["h2h"] = {str(o): v for (a, o), v in h2h.items() if a == pid}
    hist_names = {str(k): v for k, v in known.items()}

    # ---- awards / top lijsten
    def singles_total(pid):
        w = sum(v[1] for v in st[pid]["d"].values()); n = sum(v[0] for v in st[pid]["d"].values())
        return n, w

    awards = {"disc": {}}
    for d in (2, 3, 4, 5):
        rows = []
        for pid in players:
            n, w, fw, fl = st[pid]["d"][d] if d in st[pid]["d"] else (0, 0, 0, 0)
            if n >= MIN_TOP:
                rows.append({"id": pid, "n": n, "w": w, "fw": fw, "fl": fl, "pct": w / n})
        rows.sort(key=lambda r: (r["pct"], r["n"], r["fw"] - r["fl"]), reverse=True)
        awards["disc"][str(d)] = rows[:10]
    awards["doublesTop"] = sorted(
        [{"id": pid, "n": s["dbl"][0], "w": s["dbl"][1], "pct": s["dbl"][1] / s["dbl"][0]} for pid, s in st.items() if s["dbl"][0] >= MIN_TOP],
        key=lambda r: (r["pct"], r["n"]), reverse=True)[:10]
    allround = []
    for pid in players:
        ds = {d: v for d, v in st[pid]["d"].items() if v[0] > 0}
        n, w = singles_total(pid)
        if len(ds) >= 3 and n >= 5:
            allround.append({"id": pid, "n": n, "w": w, "pct": w / n, "kinds": len(ds)})
    awards["allround"] = sorted(allround, key=lambda r: (r["kinds"], r["pct"]), reverse=True)[:10]
    awards["rating"] = sorted([{"id": pid, "v": p["rating"]} for pid, p in players.items() if p["rated"]], key=lambda r: -r["v"])[:10]
    awards["risers"] = sorted([{"id": pid, "v": p["season"]["delta"], "n": p["season"]["matches"]} for pid, p in players.items() if p["season"]["matches"]],
                              key=lambda r: -r["v"])[:10]
    mp_by = {r["id"]: r["mp"] for r in mvp_rows}
    awards["mvp"] = sorted([{"id": pid, "v": p["mvp"], "n": mp_by.get(pid, 0)} for pid, p in players.items()
                            if p["mvp"] is not None and mp_by.get(pid, 0) >= MIN_MVP], key=lambda r: -r["v"])[:10]
    ups = []
    for pid, p in players.items():
        for r in p["hist"]:
            if r["t"] == season["id"] and r["win"] and r["oppR"]:
                before = r["r"] - r["delta"]
                ups.append({"id": pid, "opp": r["opp"], "diff": r["oppR"] - before, "s": r["s"], "o": r["o"], "date": r["date"]})
    awards["upsets"] = sorted(ups, key=lambda r: -r["diff"])[:10]
    awards["streaks"] = sorted([{"id": pid, "v": p["streak"]} for pid, p in players.items() if p["streak"] >= 2], key=lambda r: -r["v"])[:10]
    sp = []
    for pid in players:
        n, w, fw, fl = st[pid]["d"][5] if 5 in st[pid]["d"] else (0, 0, 0, 0)
        if n >= MIN_TOP:
            sp.append({"id": pid, "pts": fw, "n": n, "avg": fw / n})
    awards["straightpoints"] = sorted(sp, key=lambda r: -r["avg"])[:10]

    # ---- verbeterpunten
    tips = {"teams": {}, "players": {}}
    lg = {d: (v[1] / v[0] if v[0] else None) for d, v in league_disc.items()}
    for tid, tm in teams.items():
        rows = []
        for d, (n, w) in team_disc[tid].items():
            if n >= 3 and lg.get(d) is not None:
                rows.append({"d": d, "n": n, "pct": w / n, "diff": w / n - 0.5})
        tips["teams"][str(tid)] = sorted(rows, key=lambda r: r["diff"])
    for pid in players:
        n_all, w_all = singles_total(pid)
        rows = []
        for d, (n, w, fw, fl) in st[pid]["d"].items():
            if n >= 2 and n_all >= 4:
                rows.append({"d": d, "n": n, "pct": w / n, "diff": w / n - w_all / n_all})
        tips["players"][str(pid)] = sorted(rows, key=lambda r: r["diff"])

    out = {
        "meta": {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "season": season["label"],
                 "name": t["name"], "myTeam": CONFIG["myTeamId"], "tournamentId": season["id"],
                 "tournamentUrl": f"https://cuescore.com/tournament/{season.get('slug','')}/{season['id']}",
                 "ratingUrl": f"https://cuescore.com/rating/{CONFIG['rating']['slug']}/{CONFIG['rating']['id']}",
                 "meanRating": mean_rating, "relegation": rel, "promotion": prom, "sims": SIMS,
                 "seasons": [s["label"] for s in CONFIG["seasons"]], "disc": {str(k): v for k, v in DISC.items()},
                 "slots": [[d, bool(dbl)] for d, dbl in SLOTS], "kShift": K_SHIFT},
        "teams": list(teams.values()),
        "players": players,
        "matches": matches,
        "names": hist_names,
        "awards": awards,
        "mvpList": [r for r in mvp_rows if r["pos"] is not None],
        "tips": tips,
        "history": {"seasons": history["seasons"], "teamHist": {str(k): v for k, v in history["teamHist"].items()},
                    "teamNames": {str(k): v for k, v in history["teamNames"].items()}, "meetings": history["meetings"]},
        "leagueDisc": {str(d): v for d, v in league_disc.items()},
    }
    OUT.mkdir(parents=True, exist_ok=True)
    blob = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    for wrong, right in CONFIG.get("nameFixes", {}).items():  # schrijffouten in CueScore-namen
        blob = blob.replace(wrong, right)
    (OUT / "data.json").write_text(blob, encoding="utf-8")
    # data.js laat de site ook werken als je index.html direct opent (file://)
    (OUT / "data.js").write_text("window.POOL_DATA=" + blob + ";", encoding="utf-8")
    print(f"data.json geschreven: {len(teams)} teams, {len(players)} spelers, {len(matches)} wedstrijden "
          f"({sum(1 for m in matches if m['games'])} met partijdetails)")


if __name__ == "__main__":
    main()
