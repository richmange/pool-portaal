# Pool Portaal online zetten (poolinfo.nl)

Kosten: alleen het domein (ca. 8-12 euro per jaar). Hosting via GitHub Pages is gratis.

## Stap 1 - GitHub-account en lege repository
1. Maak een account op https://github.com (gratis).
2. Klik rechtsboven op "+" > "New repository". Naam: `pool-portaal`. Kies **Public** (nodig voor gratis Pages). Vink **geen** README/gitignore aan. Klik "Create repository".
3. Kopieer de repository-URL (eindigt op `.git`).

## Stap 2 - Code uploaden (doet Claude met jou)
Vanuit de projectmap:
```
git add -A
git commit -m "Eerste versie Pool Portaal"
git branch -M main
git remote add origin <URL uit stap 1>
git push -u origin main
```
Bij de eerste push opent een venster waar je met GitHub inlogt.

## Stap 3 - GitHub Pages aanzetten
1. In de repo: Settings > Pages > "Build and deployment" > Source: **GitHub Actions**.
2. Ga naar het tabblad Actions > "Nachtelijke update" > "Run workflow". Na ca. 3-5 minuten staat de site op `https://<jouw-gebruikersnaam>.github.io/pool-portaal/`.

## Stap 4 - Domein poolinfo.nl registreren
Registreer poolinfo.nl bij een registrar (bijv. TransIP, Hostnet, Vimexx of Namecheap). Kies geen extra hosting of website-pakket; alleen het domein.

## Stap 5 - Domein koppelen
Bij de DNS-instellingen van het domein:
- 4x **A-record** voor `@` (poolinfo.nl): `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- 1x **CNAME** voor `www`: `<jouw-gebruikersnaam>.github.io`

Daarna in GitHub: Settings > Pages > Custom domain: `poolinfo.nl` > Save, en vink "Enforce HTTPS" aan zodra dat kan (kan een uur duren).

## Stap 6 - Controle
- https://poolinfo.nl laadt de site.
- Actions > "Nachtelijke update" draait elke nacht (groen vinkje).
- Op je telefoon: open de site > iPhone: deelknop > "Zet op beginscherm"; Android: menu > "App installeren".

## Goed om te weten
- GitHub zet geplande acties in openbare repos uit na 60 dagen zonder activiteit. Staat er een rode melding "scheduled workflow disabled", druk dan op "Enable workflow".
- Geen geheimen of wachtwoorden in de repo: alle data is openbaar op CueScore.
- Het regelboekje (PDF) staat bewust niet in de repo.
