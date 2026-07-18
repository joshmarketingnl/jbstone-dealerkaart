/**
 * Leest dealers uit de (verborgen) Webflow Collection List.
 * Verwacht elementen met class `jb-dealer` en data-attributen
 * (zie WEBFLOW.md voor het exacte embed-snippet).
 */
export function readDealers(root = document) {
  const els = root.querySelectorAll('.jb-dealer');
  const dealers = [];

  els.forEach((el) => {
    const d = {
      slug: (el.dataset.slug || '').trim(),
      name: (el.dataset.name || '').trim(),
      plaats: (el.dataset.plaats || '').trim(),
      straat: (el.dataset.straat || '').trim(),
      postcode: (el.dataset.postcode || '').trim(),
      tel: (el.dataset.tel || '').trim(),
      url: (el.dataset.url || '').trim(),
      lat: parseFloat(String(el.dataset.lat || '').replace(',', '.')),
      lng: parseFloat(String(el.dataset.lng || '').replace(',', '.')),
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
