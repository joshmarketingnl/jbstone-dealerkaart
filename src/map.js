/* global L */

/**
 * Eén configconstante voor de tilebron (PRD §12): omschakelen naar een andere
 * provider = alleen deze twee regels aanpassen.
 * PDOK BRT Achtergrondkaart: gratis, keyless, CORS open, CC BY 4.0.
 */
export const TILE_URL =
  'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  'Kaartgegevens &copy; <a href="https://www.kadaster.nl" target="_blank" rel="noopener">Kadaster</a> / PDOK';

// Nederland, ruim genomen zodat fitBounds-padding niet klem komt te zitten.
const NL_BOUNDS = [
  [50.6, 3.1],
  [53.7, 7.4],
];

export function createMap(el, onResize) {
  const map = L.map(el, {
    center: [52.15, 5.3],
    zoom: 8,
    minZoom: 6,
    maxZoom: 18,
    maxBounds: NL_BOUNDS,
    maxBoundsViscosity: 0.8,
    // Nooit de paginascroll kapen (PRD §7.2): pas actief na interactie met de kaart.
    scrollWheelZoom: false,
    zoomControl: false,
  });

  L.control.zoom({ position: 'topright' }).addTo(map);
  map.attributionControl.setPrefix(false);

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    maxZoom: 18,
  }).addTo(map);

  // Scrollzoom aan zodra de gebruiker bewust met de kaart bezig is …
  map.on('click focus', () => map.scrollWheelZoom.enable());
  // … en weer uit zodra hij de kaart verlaat.
  map.on('blur mouseout', () => map.scrollWheelZoom.disable());

  // Grijze-tegels-preventie (PRD §9.3): hermeten na init en bij elke layoutwijziging.
  // onResize laat de caller opnieuw fitten — een fitBounds berekend op een
  // verkeerde containermaat (laden mid-layout, Webflow-shifts) wordt zo gecorrigeerd.
  setTimeout(() => map.invalidateSize(), 0);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      map.invalidateSize();
      if (onResize) onResize();
    }).observe(el);
  }

  return map;
}

/** Zoomt zo dat alle dealer-pins in beeld staan. */
export function fitAllMarkers(map, markers) {
  const withPos = markers.filter(Boolean);
  if (!withPos.length) return;
  const bounds = L.latLngBounds(withPos.map((m) => m.getLatLng()));
  map.fitBounds(bounds, { padding: [40, 40] });
}

/** Zoomt naar het zoekpunt + de drie dichtstbijzijnde dealers (PRD §7.5). */
export function fitSearchResult(map, point, nearestDealers) {
  const pts = [
    [point.lat, point.lng],
    ...nearestDealers
      .filter((d) => d.hasCoords)
      .slice(0, 3)
      .map((d) => [d.lat, d.lng]),
  ];
  map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 12 });
}
