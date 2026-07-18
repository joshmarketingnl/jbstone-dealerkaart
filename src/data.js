/**
 * Leest dealers uit de (verborgen) Webflow Collection List.
 * Verwacht elementen met class `jb-dealer` en data-attributen
 * (zie WEBFLOW.md voor het exacte embed-snippet).
 */
export function readDealers(root = document) {
  const els = root.querySelectorAll('.jb-dealer');
  const dealers = [];

  els.forEach((el) => {
    // Primair: data-attributen. Fallback: kindelementen met class jb-d-<veld>
    // (tekst gebonden aan CMS-velden; de Webflow-API kan attribuutwaarden
    // niet aan CMS-velden binden, tekst wél).
    const get = (key) => {
      const v = el.dataset[key];
      if (v) return v.trim();
      const child = el.querySelector(`.jb-d-${key}`);
      return child ? child.textContent.trim() : '';
    };
    const d = {
      slug: get('slug'),
      name: get('name'),
      plaats: get('plaats'),
      straat: get('straat'),
      postcode: get('postcode'),
      tel: get('tel'),
      url: get('url'),
      lat: parseFloat(get('lat').replace(',', '.')),
      lng: parseFloat(get('lng').replace(',', '.')),
    };

    // Sanity-check: geldige getallen én binnen (ruim) Nederland.
    d.hasCoords =
      Number.isFinite(d.lat) && Number.isFinite(d.lng) &&
      d.lat > 50 && d.lat < 54 && d.lng > 3 && d.lng < 7.6;

    if (!d.hasCoords) {
      // Dealer blijft in de lijst staan, maar krijgt geen pin (PRD §5).
      console.warn('[jbstone-map] Dealer zonder geldige lat/lng, geen pin op de kaart:', d.slug || d.name || el);
    }
    if (!d.slug) d.slug = `dealer-${dealers.length}`;
    // Webflow kan in attribuut-bindingen niet concatenaten ("/loactions/" + slug),
    // dus zonder expliciete data-url leiden we hem hier af. Typo-prefix is bewust (PRD §4).
    if (!d.url && !d.slug.startsWith('dealer-')) d.url = `/loactions/${d.slug}`;
    dealers.push(d);
  });

  return dealers;
}

/**
 * Schuift pins die vrijwel op elkaar staan (< 300 m) een fractie uit elkaar,
 * zodat ze allebei aanklikbaar blijven. Muteert de lat van de latere dealer.
 */
export function offsetNearDuplicates(dealers) {
  const placed = [];
  for (const d of dealers) {
    if (!d.hasCoords) continue;
    for (const p of placed) {
      const dLat = Math.abs(d.lat - p.lat);
      const dLng = Math.abs(d.lng - p.lng);
      // ~0,003° ≈ 300 m in NL
      if (dLat < 0.003 && dLng < 0.005) {
        d.lat += 0.0018;
        d.lng += 0.0018;
      }
    }
    placed.push(d);
  }
  return dealers;
}
