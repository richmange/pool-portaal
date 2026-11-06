# Pool Portaal

Statistieken, ranking en voorspellingen voor pool-competities in Gelderland (Tweede klasse, Eerste klasse) plus een verenigingspagina voor Poolcafe Infinity, aanvullend op CueScore.

- `scraper/fetch.py` – haalt data van CueScore (JSON-API, MVP, wedstrijddetails, KNBB-rating)
- `scraper/build.py` – berekent stats, awards, voorspellingen, titelrace -> `site/data/data.json`
- `site/` – de statische website (geen build nodig, host overal)
- `scraper/club.py` – bundelt alle Infinity-teams tot de verenigingspagina (`site/data/infinity.json`)
- `config.json` – competities (met seizoenen, eigen team, promotie/degradatie) en de Infinity-teams (`club.teams`)
- `.github/workflows/nachtelijke-update.yml` – elke nacht ophalen, berekenen en publiceren (GitHub Pages)

## Lokaal draaien
`update.bat` (Python 3.12, geen extra pakketten nodig) en open http://localhost:8765

## Publiceren
1. Zet de map in een GitHub-repo (branch `main`), Settings > Pages > Source: GitHub Actions.
2. Eigen domein later: Settings > Pages > Custom domain, en een CNAME bij je domeinregistrar.

## Seizoen of competitie toevoegen
- Seizoen: zet in `config.json` onder `competitions[].seasons` een extra seizoen met het tournament-ID uit de CueScore-URL.
- Competitie: voeg een object toe aan `competitions` (key, label, short, myTeamId, seasons). Koppel daarna het Infinity-team in `club.teams` (`comp` = key, `teamId` = CueScore-team-ID).

## Lucky 9
Zet de uitslagen in `data/lucky9.json`: `{"avonden":[{"datum":"2026-11-12","uitslag":[{"plaats":1,"naam":"Jan","punten":10}]}]}`. De site maakt er avond-uitslagen en een totaalklassement van.
