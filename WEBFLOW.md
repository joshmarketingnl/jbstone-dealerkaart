# Webflow-integratie — stap voor stap

Volg dit exact; de valkuilen staan er telkens bij. Publiceer eerst naar **staging** (`jb-stone-c5f7ce.webflow.io`), test, dan pas live.

## Stap 0 — Opruimen (eerst doen)

1. Verwijder op de homepage het verborgen NoCodeFlow-blok: `<div ncf="map" class="page-wrapper-2">` (staat direct ná de locaties-section, heeft `display:none`).
2. Verwijder de NCF custom code / het `preloader.js`-script (site-wide custom code of een embed met `data-ncf_api_key="d75ec3b4-…"`).
3. Publiceer en check in het netwerktabblad dat `maps.googleapis.com` en `nocodeflow.net` **niet meer laden**.
4. Trek daarna de Google Maps API-key in (Google Cloud Console) — hij stond publiek in de broncode.

## Stap 1 — CMS-velden toevoegen

Collectie **Dealers** (ID `667408c6ac5fbdfc27550b88`), twee nieuwe velden:

| Veldnaam | Type | Help-tekst (letterlijk overnemen) |
|---|---|---|
| `lat` | **Plain text** | Coördinaat: ga naar Google Maps, rechtsklik op het pand, klik op de getallen bovenaan. Eerste getal hier. Punt gebruiken, geen komma. Bv. 52.603141 |
| `lng` | **Plain text** | Tweede getal uit Google Maps. Bv. 6.394370 |

⚠️ **Plain text, geen Number-veld** — Number-velden kunnen coördinaten verminken (komma/afronding).

## Stap 2 — De 16 coördinaten invullen

Waarden staan in `test/dealers.fixture.json` (en PRD §6). Let op: postcode **Naarden** verifiëren — CMS zegt 1411 SK, PDOK zegt 1411 GE.

## Stap 3 — Sectie-opbouw in de Designer

In de bestaande locaties-section, ter vervanging van de statische SVG + huidige lijst:

```
Section  (bestaand, id="locaties")
└── Container (bestaand)
    ├── Heading (bestaand: "Hier kun je ons vinden" / "JB Stone Dealers")
    ├── Div — geef class:  jb-locator
    │   ├── Div — geef id:  jb-map     (verder leeg laten!)
    │   └── Div — geef id:  jb-side    (verder leeg laten!)
    └── Collection List (bron: Dealers, limiet 100)
        — geef de Collection List Wrapper de class:  jb-dealerdata
        └── Collection Item
            └── Embed element met de code hieronder
```

Embed **binnen het Collection Item** (velden koppelen via het paarse +Add Field-menu):

```html
<div class="jb-dealer"
     data-slug="SLUG_VELD"
     data-name="NAME_VELD"
     data-plaats="PLAATS_VELD"
     data-straat="STRAAT_VELD"
     data-postcode="POSTCODE_VELD"
     data-tel="TELEFOON_VELD"
     data-lat="LAT_VELD"
     data-lng="LNG_VELD"
     data-url="/loactions/SLUG_VELD">
  <a href="/loactions/SLUG_VELD">NAME_VELD — PLAATS_VELD, STRAAT_VELD, POSTCODE_VELD</a>
</div>
```

Vervang elke `*_VELD` door het echte CMS-veld via Webflow's field-insert. De `<a>` met tekst erin is bewust: zo blijft de dealerlijst crawlbaar voor Google (de wrapper wordt visueel verborgen door de CSS-klasse `jb-dealerdata`, met clip-path — **níet** `display:none`).

⚠️ De URL-prefix is `/loactions/` — de typo zit in de live collectie-slug. Niet "verbeteren" zonder redirects te regelen.

⚠️ Geef `jb-map`, `jb-side`, `jb-locator` en hun parents **géén Webflow-interactions** (geen scroll-reveal, geen fade). IX2 zet transforms die de kaart slopen.

## Stap 4 — Custom code

**Page settings van de homepage → Before `</body>` tag:**

```html
<!-- JB Stone dealerkaart -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/joshmarketingnl/jbstone-dealerkaart@v1.1.4/dist/jbstone-map.min.css"/>
<script src="https://cdn.jsdelivr.net/gh/joshmarketingnl/jbstone-dealerkaart@v1.1.4/dist/jbstone-map.min.js" defer></script>
```

Page-level, niet site-wide (alleen deze pagina heeft de kaart nodig). Bij een nieuwe release: het versienummer `@v1.1.4` in beide jsDelivr-URL's ophogen.

## Stap 5 — Oude elementen verwijderen

Pas als de nieuwe kaart op staging werkt:
- de statische SVG-kaart (`…JB Stone dealer kaart 2025 okt.svg`) + het lightbox-embed;
- de oude Collection List met `div-block-20`-rijen (de nieuwe lijst komt uit `jb-side`).

## Stap 6 — Testen op staging

- [ ] Kaart laadt, alle 16 pins, geen grijze vlakken (ook na venster-resize)
- [ ] Zoek "Amersfoort" → Naarden ± 23 km bovenaan; "3811AB" werkt ook
- [ ] Onzin invoeren → nette foutmelding
- [ ] Pin ↔ lijst selectie werkt twee kanten op; pijl gaat naar de dealerpagina
- [ ] "Gebruik mijn locatie" vraagt pas om permissie ná klik
- [ ] Mobiel (echte telefoon): zoekveld boven kaart, geen horizontale scroll
- [ ] Console: geen errors; netwerk: niets naar `maps.googleapis.com`
- [ ] Navbar/dropdowns vallen óver de kaart heen (zo niet: navbar hogere z-index geven)
- [ ] Nieuw testitem in CMS mét coördinaten → pin verschijnt na publiceren; zonder → geen pin, wel in lijst, geen errors

## Bekende gotchas

| Symptoom | Oorzaak → oplossing |
|---|---|
| Grijze/halve tegels | Container had geen maat bij init. Check dat `jb-map` niet in een tab/accordion zit; de bundle draait al `invalidateSize` + ResizeObserver |
| Kaart over de navbar | Leaflet panes z-index 400–700. Navbar `z-index: 900` + `position: relative` geven |
| Kaart kaapt paginascroll | Kan niet: scrollzoom staat uit tot de gebruiker op de kaart klikt |
| Niets zichtbaar in Designer | Normaal: custom JS draait niet in het canvas. Test op staging of zet "Run custom code in Preview" aan (Site settings → Custom code) |
| Dealer ontbreekt op kaart | lat/lng leeg of met komma i.p.v. punt → check console voor de warn met de slug |

## Addendum (18-07-2026) — gebouwde structuur via MCP

Stap 3/4 zijn headless uitgevoerd op de testpagina **/home-copy**. Afwijking t.o.v. het
embed-snippet hierboven: de Webflow-API kan attribuutwaarden niet aan CMS-velden binden,
daarom leest de bundle (v1.0.3+) de dealerdata ook uit **kindelementen**:

```
Collection Item
└── div .jb-dealer
    ├── a  (link naar collectiepagina, tekst = Name-veld)   ← crawlbaar
    ├── div .jb-d-slug    (tekst ← Slug)
    ├── div .jb-d-name    (tekst ← Name)
    ├── div .jb-d-plaats  (tekst ← Locatie!)
    ├── div .jb-d-straat  (tekst ← Adres, volledig adres in één string)
    ├── div .jb-d-tel     (tekst ← Telefoon nummer)
    ├── div .jb-d-lat     (tekst ← lat, API-slug "lat-2")
    └── div .jb-d-lng     (tekst ← lng)
```

`data-url`/`data-postcode` zijn vervallen: de bundle leidt de url af (`/loactions/<slug>`)
en toont het adres als één regel. De custom code staat in een **Embed ín de sectie**
(niet in Page settings), zodat de hele sectie in één keer naar Home te kopiëren is.
Testreferentie: `test/demo-webflow-structuur.html`.

Let op: de API kan géén "Current Location"-link of veldtokens in een Embed zetten
(tokens renderen letterlijk). De verborgen lijst bevat daarom geen statische
<a> naar de dealerpagina; de zichtbare links (lijstpijlen, popup) komen uit de
bundle en dealerpagina's staan in de sitemap. Wil je tóch een statische
crawl-link: voeg in de Designer in het Collection Item een Text Link toe en zet
"Link to" op **Current Location** (10 seconden handwerk).
