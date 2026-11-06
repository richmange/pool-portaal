"""Haalt ruwe data op van CueScore en bewaart die in data/raw/.

Bronnen (allemaal publiek):
  - api.cuescore.com/tournament/?id=...      stand, teams, programma (JSON)
  - cuescore.com/ajax/match/matchDetails.php  individuele partijen per teamwedstrijd (HTML)
  - cuescore.com/tournament/.../mvp           spelersstatistieken per spelsoort (HTML)
  - cuescore.com/rating/KNBB+Pool+Rating/...  ranking + ratingverloop per speler (HTML)

Afgeronde teamwedstrijden veranderen niet meer en worden daarom maar 1x opgehaald (cache).
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
UA = "Mozilla/5.0 (compatible; PoolPortaal/1.0; +statistieken voor eigen competitie)"
PAUSE = 0.35

RATING_URL = "https://cuescore.com/rating/{slug}/{rid}".format(
    slug=CONFIG["rating"]["slug"], rid=CONFIG["rating"]["id"]
)


def get(url, retries=3):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read().decode("utf-8", "replace")
            time.sleep(PAUSE)
            return data
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    print(f"  ! mislukt: {url} ({last})", file=sys.stderr)
    return None


def save(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def fetch_season(season):
    tid = season["id"]
    d = RAW / "seasons" / str(tid)
    print(f"Seizoen {season['label']} ({tid})")
    txt = get(f"https://api.cuescore.com/tournament/?id={tid}")
    if not txt:
        return None
    t = json.loads(txt)
    save(d / "tournament.json", txt)

    slug = season.get("slug") or urllib.parse.quote_plus(t["name"]).replace("%2F", "%252F")
    mvp = get(f"https://cuescore.com/tournament/{slug}/{tid}/mvp")
    if mvp:
        save(d / "mvp.html", mvp)

    # individuele partijen van afgeronde teamwedstrijden (gecached)
    n_new = 0
    for m in t["matches"]:
        if m.get("matchstatus") != "finished":
            continue
        f = d / "details" / f"{m['matchId']}.html"
        if f.exists():
            continue
        h = get(f"https://cuescore.com/ajax/match/matchDetails.php?tournamentId={tid}&id={m['matchId']}")
        if h:
            save(f, h)
            n_new += 1
    print(f"  {n_new} nieuwe wedstrijddetails")
    return t


def fetch_ratings(player_ids):
    lst = get(RATING_URL)
    if lst:
        save(RAW / "rating_list.html", lst)
    n = 0
    for pid in sorted(player_ids):
        h = get(f"{RATING_URL}?playerId={pid}")
        if h:
            save(RAW / "rating_players" / f"{pid}.html", h)
            n += 1
    print(f"Ratingpagina's: {n} spelers")


def player_ids_from_mvp():
    ids = set()
    for f in (RAW / "seasons").glob("*/mvp.html"):
        ids |= set(re.findall(r"/player/[^/]+/(\d+)", f.read_text(encoding="utf-8")))
    return ids


def fetch_club():
    """Toernooien die bij de vereniging (locatie) horen: lijst van CueScore + details per toernooi."""
    c = CONFIG["club"]
    h = get(f"https://cuescore.com/venue/{c['venueSlug']}/{c['venueId']}/tournaments")
    if not h:
        return
    ids = []
    for slug, tid in re.findall(r'href="(?:https?:)?(?://cuescore\.com)?/tournament/([^"?#/]+)/(\d+)"', h):
        if tid not in [i for _, i in ids]:
            ids.append((slug, tid))
    out = []
    for slug, tid in ids:
        txt = get(f"https://api.cuescore.com/tournament/?id={tid}")
        if not txt:
            continue
        try:
            j = json.loads(txt)
        except ValueError:
            continue
        out.append({"id": int(tid), "slug": slug, "name": j.get("name"), "status": j.get("status"), "start": j.get("starttime"),
                    "end": j.get("stoptime"), "discipline": j.get("discipline"), "players": len(j.get("standings") or []) if isinstance(j.get("standings"), list) else 0})
    save(RAW / "club" / "tournaments.json", json.dumps(out, ensure_ascii=False))
    print(f"Verenigingstoernooien: {len(out)}")


def main():
    for comp in CONFIG["competitions"]:
        print(f"== {comp['label']}")
        for season in comp["seasons"]:
            fetch_season(season)
    fetch_ratings(player_ids_from_mvp())
    fetch_club()


if __name__ == "__main__":
    main()
