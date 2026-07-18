/**
 * Hemelsbrede afstand tussen twee punten in kilometers (haversine).
 * Afwijking t.o.v. echte afstand ~0,5% — verwaarloosbaar voor sortering.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Geeft een nieuwe, op afstand gesorteerde lijst terug met `distanceKm` per dealer.
 * Dealers zonder coördinaten komen achteraan, zonder afstand.
 */
export function sortByNearest(dealers, userLat, userLon) {
  return dealers
    .map((d) =>
      d.hasCoords
        ? { ...d, distanceKm: haversineKm(userLat, userLon, d.lat, d.lng) }
        : { ...d, distanceKm: null }
    )
    .sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
}

/** Alfabetisch op plaats (standaardvolgorde, zoals de huidige site). */
export function sortByPlaats(dealers) {
  return [...dealers].sort((a, b) =>
    a.plaats.localeCompare(b.plaats, 'nl', { sensitivity: 'base' })
  );
}
