// Samenvatting van de poolregels (WPA-regels, Nederlandse vertaling EPBF/KNBB, uitgave 2009), in eigen woorden.
// Geen vervanging van het officiële regelement: bij twijfel geldt het KNBB/WPA-regelement.
window.REGELS = {
  bron: "Samengesteld uit de WPA-spelregels 2008–2012 (Nederlandse vertaling, EPBF/KNBB). Dit is een beknopte samenvatting; bij een discussie geldt het officiële regelement en de beslissing van de wedstrijdleider.",
  tabs: [
    { id: "competitie", titel: "Onze competitie", icon: "🏆" },
    { id: "algemeen", titel: "Algemeen", icon: "📘" },
    { id: "8ball", titel: "8-ball", icon: "8️⃣" },
    { id: "9ball", titel: "9-ball", icon: "9️⃣" },
    { id: "10ball", titel: "10-ball", icon: "🔟" },
    { id: "straight", titel: "Straight pool", icon: "🎯" },
    { id: "fouls", titel: "Fouls", icon: "🚫" },
    { id: "vergelijk", titel: "Vergelijken", icon: "⚖️" },
  ],
  secties: {
    competitie: {
      intro: "Zo is een teamwedstrijd in de Gelderse Tweede klasse opgebouwd (volgens de wedstrijdinstellingen op CueScore).",
      blokken: [
        { k: "Opbouw van een avond", l: [
          "Een teamwedstrijd bestaat uit <b>6 partijen</b>: koppel 10-ball (race tot 4), 8-ball (race tot 4), straight pool (tot 40 punten), nog een keer 8-ball (race tot 4), 9-ball (race tot 5) en 10-ball (race tot 5).",
          "Het team dat de meeste partijen wint, wint de wedstrijd. Bij 3–3 is het gelijkspel.",
          "<b>Punten in de stand</b>: elke gewonnen partij levert 1 punt op, plus 1 bonuspunt voor het winnen van de hele wedstrijd.",
        ]},
        { k: "Wie speelt wat?", l: [
          "Een speler speelt maximaal <b>2,5 wedstrijd</b>: een enkelspel telt voor 1, het koppel voor 0,5.",
          "Je speelt dus maximaal 3 potten, en 3 potten kan alleen als het koppel daar één van is. Gemiddeld speelt iemand ongeveer 2 potten per avond.",
          "Kies de opstelling slim met de <a href=\"#/voorspel\">Voorspeller</a>: vink aan wie er is en je ziet de beste verdeling.",
        ]},
        { k: "Break", l: [
          "Standaard geldt <b>alternate break</b>: de spelers breken om en om. De winnaar van de lag kiest wie in de eerste partij breekt.",
        ]},
      ],
    },
    algemeen: {
      intro: "Regels die bij (bijna) elk pool-spel gelden.",
      blokken: [
        { k: "De lag (wie mag kiezen?)", l: [
          "Twee ballen liggen op de hoofdlijn. Beide spelers stoten tegelijk naar de voetband; wie met de bal het dichtst bij de hoofdband stopt, wint de lag en kiest wie het eerste rack breekt.",
          "De lag is ongeldig als je bal de lengteas kruist, de voetband niet of meer dan één keer raakt, van tafel gaat, de lange band raakt of in de hoekpocket eindigt voorbij de hoofdband.",
          "Je moet opnieuw laggen als iemand te vroeg stoot, als niet te zien is wie dichterbij ligt, of als beide lags ongeldig zijn.",
        ]},
        { k: "Cue ball in hand", l: [
          "Na bepaalde fouls plaatst de tegenstander de witte bal waar hij maar wil op tafel (bij een break alleen in het hoofdveld).",
          "Je mag de bal met elk deel van de keu verplaatsen, maar niet met een voorwaartse stootbeweging.",
        ]},
        { k: "Call shot", l: [
          "Waar call shot geldt, noem je bij elke stoot de bal en de pocket als dat niet vanzelfsprekend is. Hoe de bal er komt (banden, combinaties) hoef je niet te zeggen.",
          "Je kunt ook een <b>safety</b> callen: dan eindigt je beurt na de stoot, ook als er toevallig een bal valt.",
        ]},
        { k: "Materiaal", l: [
          "Toegestaan: eigen keu (ook break- en jumpkeu), verlengstuk, krijt in de kleur van het laken, maximaal twee mechanische bruggen, handschoen en een redelijke hoeveelheid poeder.",
        ]},
        { k: "Tafel en balplaatsing", l: [
          "<b>Spotten</b>: een terug te plaatsen bal gaat op de lengteas zo dicht mogelijk bij de voetspot, zonder andere ballen te verplaatsen.",
          "Een bal die zich vanzelf nestelt en in de pocket valt, wordt teruggezet; een bal die al even stil lag en dan vanzelf valt, telt niet als gepot.",
          "Wordt een stoot verstoord door iets van buitenaf, dan worden de ballen teruggezet en wordt de stoot overgespeeld.",
        ]},
        { k: "Gedrag en procedures", l: [
          "Je bent zelf verantwoordelijk dat je de regels kent. Een foul moet <b>direct</b> gecalld worden, vóór de volgende stoot, anders geldt hij als niet gebeurd.",
          "Zijn er meerdere fouls in één stoot, dan telt alleen de zwaarste.",
          "<b>Patstelling</b>: de scheidsrechter waarschuwt als er geen vooruitgang is; daarna krijgen beide spelers nog 3 beurten. Is er dan nog steeds geen vooruitgang, dan wordt het rack opnieuw gebroken (bij straight pool wordt opnieuw gelagd).",
          "Opgeven betekent de wedstrijd verliezen.",
        ]},
      ],
    },
    "8ball": {
      intro: "15 ballen: heel (1–7) tegen half (9–15). Wie zijn groep leegmaakt en daarna de 8 pot, wint het rack.",
      blokken: [
        { k: "Break", l: [
          "Witte bal in hand in het hoofdveld. Je hoeft niets te callen en elke bal mag eerst geraakt worden.",
          "Pot je een bal zonder foul, dan blijf je aan tafel en is de tafel nog <b>open</b>.",
          "Valt er niets, dan moeten minimaal 4 objectballen een band raken. Anders is het een illegale break: de tegenstander mag de tafel accepteren of laten opnieuw racken (zelf breken of de breker nog eens laten breken).",
          "8 gepot op een legale break: de breker mag de 8 spotten en doorspelen of opnieuw breken. Scratch je daarbij, dan mag de tegenstander de 8 spotten en doorspelen met ball-in-hand achter de hoofdlijn, of zelf opnieuw breken.",
        ]},
        { k: "Open tafel en groepskeuze", l: [
          "Zolang de tafel open is, call je elke bal. Pot je je gecallde bal legaal, dan is dat jouw groep en heeft de tegenstander de andere. Mis je, dan blijft de tafel open en is de tegenstander aan de beurt.",
          "Bij een open tafel mag je elke bal eerst raken, behalve de 8.",
        ]},
        { k: "Spelverloop", l: [
          "Je blijft aan tafel zolang je gecallde ballen van je eigen groep legaal blijft potten.",
          "Alle stoten behalve de break worden gecalld. De 8 callen mag pas als al je eigen ballen van tafel zijn.",
          "Je mag een safety callen; gepotte ballen blijven dan van tafel.",
        ]},
        { k: "Rack verloren", l: [
          "Je verliest direct als je: een foul maakt terwijl je de 8 pot, de 8 pot terwijl er nog een bal van jouw groep ligt, de 8 in een niet-gecallde pocket pot, of de 8 van tafel speelt (niet bij de break).",
        ]},
        { k: "Fouls en gevolg", l: [
          "Bij een standaard foul krijgt de tegenstander ball-in-hand over de hele tafel. Eerst geraakte bal moet uit je eigen groep komen (bij open tafel mag alles behalve de 8).",
          "De regel 'drie opeenvolgende fouls' geldt <b>niet</b> bij 8-ball.",
        ]},
      ],
    },
    "9ball": {
      intro: "9 ballen, altijd de laagste bal eerst raken. Wie de 9 legaal pot, wint het rack.",
      blokken: [
        { k: "Break", l: [
          "Rack in ruitvorm: de 1 vooraan op de voetspot, de 9 in het midden. Witte bal in hand in het hoofdveld.",
          "Valt er niets, dan moeten minimaal 4 objectballen een band raken, anders is het een foul.",
        ]},
        { k: "Push out", l: [
          "Na een break zonder foul mag de speler die aan de beurt komt een <b>push out</b> aankondigen. Dan mag hij de bal ergens heen spelen zonder dat 'verkeerde bal eerst' of 'geen band' een foul is.",
          "Daarna mag de tegenstander kiezen wie de volgende stoot speelt.",
        ]},
        { k: "Spelverloop", l: [
          "Pot je legaal welke bal dan ook, dan blijf je aan tafel. Pot je de 9 legaal (niet bij een push out), dan win je het rack.",
          "Mis je of maak je een foul, dan is de tegenstander aan de beurt. Bij een foul krijgt hij ball-in-hand over de hele tafel.",
          "Alleen de 9 wordt gespot (bij foul, push out of van tafel). Andere ballen blijven van tafel.",
        ]},
        { k: "Drie fouls", l: [
          "Drie opeenvolgende fouls binnen één rack kosten je dat rack (de scheidsrechter moet je na de tweede foul waarschuwen).",
        ]},
      ],
    },
    "10ball": {
      intro: "Net als 9-ball, maar met 10 ballen en verplicht call shot. Wie de 10 legaal pot, wint het rack.",
      blokken: [
        { k: "Break", l: [
          "Rack in driehoek met de 10 in het midden. Niet callen bij de break. Valt er niets, dan moeten minimaal 4 ballen een band raken.",
          "Wordt de 10 gepot bij een legale break, dan wordt hij gespot en speelt de breker door.",
        ]},
        { k: "Call shot", l: [
          "Elke stoot behalve de break wordt gecalld: één bal en pocket per stoot. De laagste bal moet altijd eerst geraakt worden.",
          "<b>Mispot</b>: pot je een bal maar niet de gecallde, dan is je beurt voorbij. De tegenstander mag de tafel accepteren of jou terug laten spelen.",
          "<b>Safety</b>: roep 'safety' en je beurt eindigt na legaal balcontact. Pot je daarbij toch een bal, dan mag de tegenstander kiezen: accepteren of jou terug laten spelen.",
        ]},
        { k: "Push out", l: [
          "Net als bij 9-ball: na een legale break mag de volgende speler een push out aankondigen. Valt de 10 op een push out, dan wordt hij gespot.",
        ]},
        { k: "Fouls en gevolg", l: [
          "Foul = ball-in-hand voor de tegenstander over de hele tafel. Drie opeenvolgende fouls in één rack = rack verloren.",
          "Alleen de 10 wordt gespot (bij foul, push out, break zonder call of van tafel).",
        ]},
      ],
    },
    straight: {
      intro: "Ook 14.1 continuous genoemd. Elke gecallde bal die je legaal pot, is 1 punt. In onze competitie speel je tot 40 punten.",
      blokken: [
        { k: "Opzet", l: [
          "15 ballen in een driehoek. Na de lag breekt de winnaar (of de gekozen speler). Alle stoten moeten gecalld worden.",
          "Zodra 14 ballen gepot zijn, worden die 14 opnieuw gerackt (de plek van de voetspot blijft leeg) en de 15e bal blijft liggen. Jij speelt dan door.",
        ]},
        { k: "Openingsbreak", l: [
          "Witte bal in hand in het hoofdveld. Pot je geen gecallde bal, dan moeten de witte bal en minimaal twee objectballen een band raken.",
          "Lukt dat niet: openingsfoul. Dat kost <b>2 punten</b>, en de tegenstander mag de tafel accepteren of jou opnieuw laten breken.",
        ]},
        { k: "Scoren", l: [
          "Elke legaal gepotte gecallde bal telt 1 punt; andere ballen die bij die stoot vallen tellen ook mee.",
          "Een foul kost 1 punt (je score kan dus negatief worden). Gepotte ballen bij een foul, safety of misser worden gespot.",
          "Je mag een safety callen; gepotte ballen worden dan ook gespot.",
        ]},
        { k: "Fouls en drie fouls", l: [
          "Na een foul speelt de tegenstander verder vanaf waar de witte bal ligt (behalve bij een scratch: dan ball-in-hand achter de hoofdlijn).",
          "<b>Drie opeenvolgende fouls</b> kosten 1 punt en daarna nog 15 punten. Je foul-teller start opnieuw, alle ballen worden opnieuw gerackt en jij moet breken als bij een openingsbreak.",
        ]},
        { k: "Bijzondere racksituaties", l: [
          "Ligt de witte of de 15e bal in het rackgebied, dan zijn er vaste regels: o.a. de 15e bal gaat naar de hoofdspot (of middenspot) en de witte bal wordt geplaatst volgens het schema. Vraag de scheidsrechter om de juiste situatie.",
        ]},
      ],
    },
    fouls: {
      intro: "De meest voorkomende fouls (per spel kan het gevolg verschillen; zie de andere tabbladen).",
      blokken: [
        { k: "Lijst", l: [
          "<b>Witte bal in de pocket of van tafel</b> (scratch).",
          "<b>Verkeerde bal eerst geraakt</b> (bijv. niet de laagste bij 9/10-ball, niet een bal van je eigen groep bij 8-ball).",
          "<b>Geen band na balcontact</b>: als er niets valt, moet na contact met een objectbal minstens één bal een band raken.",
          "<b>Geen voet op de grond</b> op het moment van de stoot.",
          "<b>Bal van tafel</b> gespeeld.",
          "<b>Ballen aanraken</b> met lichaam, kleding, krijt of brug.",
          "<b>Dubbele hit</b> of schampen als de witte bal heel dicht tegen een bal ligt, en <b>duwstoot</b> (de pomerans blijft te lang tegen de bal).",
          "<b>Stoten terwijl ballen nog rollen</b> of spinnen.",
          "<b>Foutieve plaatsing</b> van de witte bal bij een break/ball-in-hand in het hoofdveld, of een bal aanspelen die ook in het hoofdveld ligt zonder eerst de hoofdlijn te passeren.",
          "<b>Keu op de tafel</b> leggen om een stoot te berekenen.",
          "<b>Niet aan de beurt</b> spelen.",
          "<b>Langzaam spel</b>: de scheidsrechter kan een shotclock inschakelen; overschrijding is een foul.",
          "<b>Onsportief gedrag</b>: afleiden, ballen verplaatsen, met opzet missen, doorspelen na een foul, oefenen tijdens de wedstrijd, de tafel markeren, het spel vertragen. De straf varieert van waarschuwing tot verlies van rack, wedstrijd of diskwalificatie.",
        ]},
        { k: "Handig om te weten", l: [
          "Een foul moet direct gecalld worden. Wordt er niets gezegd vóór de volgende stoot, dan is er niets gebeurd.",
          "Bij 8-ball, 9-ball en 10-ball geeft een foul de tegenstander ball-in-hand over de hele tafel; bij straight pool kost het 1 punt.",
        ]},
      ],
    },
    vergelijk: {
      intro: "De vier gespeelde spellen naast elkaar.",
      tabel: {
        kop: ["", "8-ball", "9-ball", "10-ball", "Straight pool"],
        rijen: [
          ["Ballen", "15 (heel/half) + 8", "9", "10", "15 (14 + 1 reserve)"],
          ["Doel", "Groep leeg, dan de 8", "9 legaal potten", "10 legaal potten", "Tot 40 punten"],
          ["Call shot", "Ja (behalve break)", "Nee", "Ja (behalve break)", "Ja"],
          ["Volgorde", "Eigen groep", "Laagste eerst", "Laagste eerst", "Elke bal"],
          ["Push out", "Nee", "Ja", "Ja", "Nee"],
          ["Min. ballen op band bij break", "4", "4", "4", "Wit + 2 ballen"],
          ["Gevolg foul", "Ball-in-hand", "Ball-in-hand", "Ball-in-hand", "−1 punt"],
          ["3 fouls", "Geldt niet", "Rack verloren", "Rack verloren", "−1 en −15 punten"],
          ["Race in onze competitie", "tot 4", "tot 5", "tot 5 (koppel tot 4)", "tot 40 punten"],
        ],
      },
    },
  },
};
