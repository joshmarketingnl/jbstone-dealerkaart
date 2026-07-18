# JB Stone dealerkaart

Interactieve dealerkaart voor [jbstone.nl](https://jbstone.nl) — vervangt de statische SVG op de homepage (`#locaties`).

**Stack:** Leaflet 1.9.4 · PDOK BRT Achtergrondkaart (`grijs`, EPSG:3857) · PDOK Locatieserver (geocoding) · Webflow CMS als databron. Alles keyless, gratis en zonder facturatierisico — onderbouwing in de PRD (`JB Stone/.ai/research/dealerkaart/PRD-dealerkaart.md` in OneDrive).

## Structuur

```
src/            broncode (ES modules, geen framework, geen dependencies)
dist/           gebundelde + geminificeerde output (in git, want jsDelivr serveert uit de repo)
demo.html       standalone testpagina met de 16 dealers hardcoded
test/           dealers.fixture.json — de 16 geocodeerde dealers
WEBFLOW.md      volledige integratie-instructie voor de Webflow Designer
```

## Bouwen

```sh
npm install          # alleen esbuild
npm run build        # → dist/jbstone-map.min.js + .css
npm run serve        # → http://localhost:8741/demo.html
```

## Releasen (jsDelivr)

jsDelivr serveert direct uit deze GitHub-repo, **gepind op een git tag** — nooit op `main` (branch-refs cachen tot ~12 uur, tags niet):

```sh
npm run build
git add -A && git commit -m "…"
git tag v1.x.x
git push && git push --tags
```

Daarna in Webflow de versie in de twee URL's bijwerken:

```
https://cdn.jsdelivr.net/gh/joshmarketingnl/jbstone-dealerkaart@v1.x.x/dist/jbstone-map.min.css
https://cdn.jsdelivr.net/gh/joshmarketingnl/jbstone-dealerkaart@v1.x.x/dist/jbstone-map.min.js
```

## Config

- **Tilebron wisselen:** één constante, `TILE_URL` bovenaan `src/map.js`. Fallback-volgorde bij PDOK-uitval: OpenFreeMap (vereist MapLibre), Thunderforest, eigen PMTiles — zie PRD §12.
- **Geocoder:** `ENDPOINT` bovenaan `src/search.js` (PDOK Locatieserver v3_1 `free`).
- **Huisstijl:** CSS custom properties bovenaan `src/styles.css` (`--jb-blue: #006CD8` etc.).

## DOM-contract

Het script verwacht op de pagina:

```html
<div class="jb-locator">
  <div id="jb-map"></div>
  <div id="jb-side"></div>   <!-- JS rendert hier zoekveld + lijst in -->
</div>
<!-- plus per dealer een (verborgen) databron-element: -->
<div class="jb-dealer" data-slug data-name data-plaats data-straat
     data-postcode data-tel data-lat data-lng data-url></div>
```

Dealers zonder geldige `data-lat`/`data-lng` krijgen géén pin maar blijven in de lijst staan (met `console.warn`). Debug-handle: `window.__JB_MAP__` (map + registry).
