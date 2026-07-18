/**
 * Geocoding via PDOK Locatieserver `free` (PRD §3.3).
 * Keyless, CORS open, CC BY 4.0. Eén call geeft direct coördinaten —
 * gebruik nooit `suggest` (dat geeft geen coördinaten).
 */
const ENDPOINT = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';
const TIMEOUT_MS = 4000;

let inflight = null;

/**
 * Zoekt een plaats/postcode/gemeente op.
 * @returns {Promise<{lat:number,lng:number,label:string,type:string}|null>}
 *   null = geen resultaat. Gooit bij netwerkfout/timeout.
 *   Een nieuwe call breekt de vorige af (AbortController, PRD §7.5);
 *   een afgebroken call resolvet naar undefined — negeer die stil.
 */
export async function geocode(q) {
  if (inflight) inflight.abort();
  const ctrl = new AbortController();
  inflight = ctrl;
  const timer = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS);

  const params = new URLSearchParams({
    q,
    fq: 'type:(woonplaats OR postcode OR gemeente)',
    rows: '1',
    fl: 'weergavenaam,type,centroide_ll',
  });

  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`PDOK http ${res.status}`);
    const data = await res.json();
    const doc = data && data.response && data.response.docs && data.response.docs[0];
    if (!doc || !doc.centroide_ll) return null;

    // WKT "POINT(lon lat)" — lon staat vóór lat (PRD §3.3, dé klassieke bug).
    const m = /POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/.exec(doc.centroide_ll);
    if (!m) return null;
    return {
      lng: parseFloat(m[1]),
      lat: parseFloat(m[2]),
      label: doc.weergavenaam || q,
      type: doc.type || '',
    };
  } catch (err) {
    if (ctrl.signal.aborted && ctrl.signal.reason !== 'timeout') {
      // Vervangen door een nieuwere zoekopdracht: stil negeren.
      return undefined;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (inflight === ctrl) inflight = null;
  }
}

/**
 * Browser-geolocatie als Promise. Alleen aanroepen op expliciete klik (PRD §7.6).
 */
export function geolocate() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(Object.assign(new Error('unsupported'), { code: 'UNSUPPORTED' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
}
