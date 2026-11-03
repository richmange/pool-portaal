# Pool Portaal

Statistieken, ranking en voorspellingen voor de Pool Gelderland Tweede klasse, aanvullend op CueScore.

- `scraper/fetch.py` – haalt data van CueScore (JSON-API, MVP, wedstrijddetails, KNBB-rating)
- `scraper/build.py` – berekent stats, awards, voorspellingen, titelrace -> `site/data/data.json`
- `site/` – de statische website (geen build nodig, host overal)
- `config.json` – seizoenen, jouw team, promotie/degradatie-plekken
- `.github/workflows/nachtelijke-update.yml` – elke nacht ophalen, berekenen en publiceren (GitHub Pages)

## Lokaal draaien
`update.bat` (Python 3.12, geen extra pakketten nodig) en open http://localhost:8765

## Publiceren
1. Zet de map in een GitHub-repo (branch `main`), Settings > Pages > Source: GitHub Actions.
2. Eigen domein later: Settings > Pages > Custom domain, en een CNAME bij je domeinregistrar.

## Seizoen toevoegen
Zet in `config.json` onder `seasons` een extra seizoen met het tournament-ID uit de CueScore-URL.
