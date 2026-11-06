"""Verenigingsoverzicht (Infinity): bundelt de competitiedata van alle teams van de vereniging.

Invoer: de resultaten van build.build() per competitie (dict `outs`) en config["club"].
Uitvoer: één dict voor site/data/infinity.json.
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
MIN_N = 3      # minimaal aantal partijen voor de winstpercentage-lijsten
MIN_MVP = 5    # minimaal aantal potten voor de MVP-lijst
DISC_NAMES = {"2": "8-ball", "3": "9-ball", "4": "10-ball", "5": "Straight pool"}


def _tournaments(club):
    f = RAW / "club" / "tournaments.json"
    rows = json.loads(f.read_text(encoding="utf-8")) if f.exists() else []
    out = []
    for r in rows:
        n = r.get("name") or ""
        low = n.lower()
        kind = ("NK" if low.startswith(("nk ", "open nk")) else
                "Teams Cup" if "teams cup" in low else
                "Regionale ranking" if "regionale ranking" in low else "Overig")
        out.append({**r, "kind": kind})
    out.sort(key=lambda r: r.get("start") or "", reverse=True)
    return out


def build_club(cfg, outs):
    club = cfg["club"]
    teams, members = [], {}
    club_ids = {(t["comp"], t["teamId"]) for t in club["teams"] if t.get("comp") and t.get("teamId")}
    upcoming, recent, derbies = [], [], []
    tot = {"played": 0, "w": 0, "d": 0, "l": 0, "fw": 0, "fl": 0}

    for ct in club["teams"]:
        e = {"name": ct["name"], "day": ct.get("day"), "captain": ct.get("captain"), "roster": ct.get("roster", []),
             "comp": ct.get("comp"), "teamId": ct.get("teamId"), "found": False}
        o = outs.get(ct.get("comp"))
        tm = next((x for x in o["teams"] if x["id"] == ct.get("teamId")), None) if o else None
        if not tm:
            teams.append(e)
            continue
        names = {x["id"]: x["name"] for x in o["teams"]}
        tb = tm["table"]
        e.update({
            "found": True, "compLabel": o["meta"]["short"], "season": o["meta"]["season"], "cueName": tm["name"],
            "table": tb, "form": tm["form"], "strength": tm["strength"], "nTeams": len(o["teams"]),
            "promotion": o["meta"]["promotion"], "relegation": o["meta"]["relegation"],
            "race": {"title": tm["race"]["title"], "top3": tm["race"]["top3"], "relegation": tm["race"]["relegation"], "expPts": tm["race"]["expPts"]},
            "standings": [{"id": x["id"], "name": x["name"], "pos": x["table"]["pos"], "played": x["table"]["played"], "pts": x["table"]["pts"],
                           "fw": x["table"]["fw"], "fl": x["table"]["fl"], "inf": (ct["comp"], x["id"]) in club_ids}
                          for x in sorted(o["teams"], key=lambda x: x["table"]["pos"])],
        })
        teams.append(e)
        for k in ("played", "w", "d", "l", "fw", "fl"):
            tot[k] += tb[k]
        # wedstrijden
        for m in o["matches"]:
            if tm["id"] not in (m["home"], m["away"]):
                continue
            home = m["home"] == tm["id"]
            opp = m["away"] if home else m["home"]
            row = {"comp": ct["comp"], "team": ct["name"], "teamId": tm["id"], "id": m["id"], "round": m["round"], "start": m["start"],
                   "home": home, "opp": names.get(opp, str(opp)), "oppInf": (ct["comp"], opp) in club_ids}
            if m["status"] == "finished":
                row.update({"s": m["sa"] if home else m["sb"], "o": m["sb"] if home else m["sa"]})
                recent.append(row)
            else:
                pr = m.get("pred")
                if pr:
                    row["win"] = pr["win"] if home else pr["loss"]
                    row["draw"] = pr["draw"]
                    row["ef"] = pr["ef"] if home else 6 - pr["ef"]
                upcoming.append(row)
            if home and (ct["comp"], opp) in club_ids:  # onderlinge wedstrijd, één keer tellen
                derbies.append({"comp": ct["comp"], "id": m["id"], "round": m["round"], "start": m["start"], "home": tm["name"], "away": names.get(opp),
                                "sa": m["sa"], "sb": m["sb"], "done": m["status"] == "finished"})
        # spelers
        ranked = {r["id"]: r for r in o["mvpList"]}
        for pid in tm["players"]:
            p = o["players"].get(str(pid)) or o["players"].get(pid)
            if not p:
                continue
            ordered_rating = sorted((x["rating"] for x in o["players"].values()), reverse=True)
            m = members.setdefault(pid, {"id": pid, "name": p["name"], "teams": [], "disc": {}, "dbl": [0, 0, 0, 0], "rating": p["rating"],
                                         "rated": p["rated"], "streak": p["streak"], "delta": 0, "matches": 0, "mvp": None, "mp": 0, "classes": []})
            m["teams"].append({"name": ct["name"], "comp": ct["comp"]})
            for d, v in p["disc"].items():
                a = m["disc"].setdefault(d, [0, 0, 0, 0])
                for i in range(4):
                    a[i] += v[i]
            for i in range(4):
                m["dbl"][i] += p["dbl"][i]
            m["delta"] += p["season"]["delta"]
            m["matches"] += p["season"]["matches"]
            r = ranked.get(pid)
            cls = {"comp": ct["comp"], "compLabel": o["meta"]["short"], "mvpPos": r["pos"] if r else None, "of": len(ranked),
                   "ratingPos": 1 + sum(1 for x in ordered_rating if x > p["rating"]), "players": len(o["players"]), "team": ct["name"]}
            m["classes"].append(cls)
            if p["mvp"] is not None and (m["mvp"] is None or p["mvp"] > m["mvp"]):
                m["mvp"] = p["mvp"]
            m["mp"] += r["mp"] if r else 0

    # ----- ranglijsten
    ml = list(members.values())
    for m in ml:
        n = sum(v[0] for v in m["disc"].values()) + m["dbl"][0]
        w = sum(v[1] for v in m["disc"].values()) + m["dbl"][1]
        m["n"], m["w"] = n, w
    mvp = sorted([m for m in ml if m["mvp"] is not None and m["mp"] >= MIN_MVP], key=lambda m: -m["mvp"])
    disc_top = {}
    for d in ("2", "3", "4", "5"):
        rows = [{"id": m["id"], "n": m["disc"][d][0], "w": m["disc"][d][1], "fw": m["disc"][d][2], "fl": m["disc"][d][3]}
                for m in ml if d in m["disc"] and m["disc"][d][0] >= MIN_N]
        rows.sort(key=lambda r: (r["w"] / r["n"], r["n"], r["fw"] - r["fl"]), reverse=True)
        disc_top[d] = rows[:5]
    rows = [{"id": m["id"], "n": m["dbl"][0], "w": m["dbl"][1], "fw": m["dbl"][2], "fl": m["dbl"][3]} for m in ml if m["dbl"][0] >= MIN_N]
    rows.sort(key=lambda r: (r["w"] / r["n"], r["n"]), reverse=True)
    disc_top["dbl"] = rows[:5]
    by_class = defaultdict(list)
    for m in ml:
        for c in m["classes"]:
            if c["mvpPos"] is not None:
                by_class[c["comp"]].append({"id": m["id"], "pos": c["mvpPos"], "of": c["of"], "team": c["team"], "compLabel": c["compLabel"]})
    class_top = {k: sorted(v, key=lambda r: r["pos"])[:6] for k, v in by_class.items()}

    # ----- weetjes
    facts = []

    def add(ic, title, text, bad=False):
        facts.append({"ic": ic, "title": title, "text": text, "bad": bad})

    found = [t for t in teams if t["found"]]
    if tot["played"]:
        add("🏆", f"{tot['w']} winst, {tot['d']} gelijk, {tot['l']} verlies",
            f"Samen spelen de Infinity-teams {tot['played']} wedstrijden; partijen {tot['fw']}-{tot['fl']} ({round(100 * tot['fw'] / max(1, tot['fw'] + tot['fl']))}% gewonnen).")
    if found:
        best = min(found, key=lambda t: (t["table"]["pos"] - 1) / max(1, t["nTeams"] - 1))
        add("👑", f"Best geplaatst: {best['name']}", f"Plaats {best['table']['pos']} van {best['nTeams']} in {best['compLabel']}, {best['table']['pts']} punten.")
        st = max(found, key=lambda t: t["strength"])
        add("⚖️", f"Sterkste team op papier: {st['name']}", f"Gemiddelde spelersrating {st['strength']}.")
    if ml:
        top = max(ml, key=lambda m: m["rating"])
        add("⭐", f"Hoogste rating: {top['name']}", f"{top['rating']} ({top['teams'][0]['name']}).")
        busy = max(ml, key=lambda m: m["n"])
        if busy["n"]:
            add("🛠️", f"Werkpaard: {busy['name']}", f"{busy['n']} competitiepartijen gespeeld dit seizoen, het meest van de vereniging.")
        hot = max(ml, key=lambda m: m["streak"])
        if hot["streak"] >= 3:
            add("🔥", f"{hot['name']}: {hot['streak']} gewonnen op rij", "Langste huidige winstreeks van de vereniging.")
        rs = max(ml, key=lambda m: m["delta"])
        if rs["delta"] > 0:
            add("📈", f"Opkomend: {rs['name']}", f"+{rs['delta']} ratingpunten dit seizoen.")
        perfect = [m for m in ml if m["n"] >= 4 and m["w"] == m["n"]]
        for m in perfect:
            add("💯", f"Foutloos: {m['name']}", f"Alle {m['n']} partijen gewonnen.")
        multi = [m for m in ml if len(m["teams"]) > 1]
        if multi:
            add("🔀", "Spelen in meer teams", ", ".join(f"{m['name']} ({len(m['teams'])} teams)" for m in multi) + ".")
    best_game = None
    for key, o in outs.items():
        for m in o["matches"]:
            if m["status"] != "finished":
                continue
            for side, tid in (("a", m["home"]), ("b", m["away"])):
                if (key, tid) not in club_ids:
                    continue
                mine, theirs = (m["sa"], m["sb"]) if side == "a" else (m["sb"], m["sa"])
                names = {x["id"]: x["name"] for x in o["teams"]}
                opp = names[m["away"] if side == "a" else m["home"]]
                if best_game is None or mine - theirs > best_game[0]:
                    best_game = (mine - theirs, mine, theirs, names[tid], opp)
    if best_game and best_game[0] > 0:
        add("💪", f"Grootste winst: {best_game[1]}-{best_game[2]}", f"{best_game[3]} tegen {best_game[4]}.")
    done_derbies = [d for d in derbies if d["done"]]
    for d in done_derbies:
        add("⚔️", f"Onderling duel: {d['sa']}-{d['sb']}", f"{d['home']} – {d['away']} (ronde {d['round']}).")

    recent.sort(key=lambda r: r["start"], reverse=True)
    upcoming.sort(key=lambda r: r["start"])
    tn = _tournaments(club)
    lucky = ROOT / "data" / "lucky9.json"
    return {
        "meta": {"name": club["name"], "label": club["label"], "venueUrl": f"https://cuescore.com/venue/{club['venueSlug']}/{club['venueId']}",
                 "updated": max((o["meta"]["updated"] for o in outs.values()), default=""), "discNames": DISC_NAMES},
        "teams": teams,
        "totals": tot,
        "members": sorted(ml, key=lambda m: -m["rating"]),
        "mvp": [{"id": m["id"], "v": m["mvp"], "mp": m["mp"]} for m in mvp],
        "discTop": disc_top,
        "classTop": class_top,
        "facts": facts,
        "upcoming": upcoming[:12],
        "recent": recent[:10],
        "derbies": sorted(derbies, key=lambda d: d["start"]),
        "tournaments": tn,
        "lucky9": json.loads(lucky.read_text(encoding="utf-8")) if lucky.exists() else {"avonden": []},
    }
