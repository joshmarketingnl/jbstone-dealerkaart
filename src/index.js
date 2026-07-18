/**
 * JB Stone dealerkaart — entrypoint.
 *
 * Verwacht in de DOM:
 *   <div id="jb-map"></div>       kaartcontainer
 *   <div id="jb-side"></div>      rechterkolom (JS rendert de inhoud)
 *   <div class="jb-dealer" data-…> per dealer (verborgen Collection List)
 *
 * Zie WEBFLOW.md voor de integratie.
 */
import { readDealers, offsetNearDuplicates } from './data.js';
import { createMap, fitAllMarkers, fitSearchResult, setOverlayRight, flyToFree, nlMaxBounds } from './map.js';
import { createDealerMarker, createUserMarker, setMarkerState, esc } from './markers.js';
import { buildSide, renderList } from './list.js';
import { sortByNearest, sortByPlaats } from './distance.js';
import { geocode, geolocate } from './search.js';

function init() {
  const mapEl = document.getElementById('jb-map');
  const sideEl = document.getElementById('jb-side');
  if (!mapEl || !sideEl) return;

  const dealers = offsetNearDuplicates(readDealers());
  if (!dealers.length) {
    console.warn('[jbstone-map] Geen .jb-dealer elementen gevonden.');
    return;
  }

  // Overlay-layout (paneel zweeft over de kaart): dan mag focus alleen de
  // vrije strook links gebruiken. Detectie op computed style, zodat de
  // mediaquery (mobiel = gestapeld) vanzelf meeweegt.
  let mapRef = null;
  function updateOverlay() {
    const zweeft = getComputedStyle(sideEl).position === 'absolute';
    setOverlayRight(zweeft ? sideEl.offsetWidth + 48 : 0);
    if (mapRef) mapRef.setMaxBounds(nlMaxBounds());
  }
  updateOverlay();

  // Zolang de gebruiker de kaart niet zelf heeft bediend, houden we de
  // "juiste" view vast en herstellen die na elke containerresize.
  let userInteracted = false;
  let currentFit = null;
  mapEl.addEventListener('pointerdown', () => { userInteracted = true; });
  mapEl.addEventListener('wheel', () => { userInteracted = true; });

  const map = createMap(mapEl, () => {
    updateOverlay();
    if (!userInteracted && currentFit) currentFit();
  });
  mapRef = map;
  updateOverlay();

  // Registry: single source of truth voor de kaart↔lijst-koppeling (PRD §7.7).
  const registry = new Map(); // slug → { dealer, marker, row }
  dealers.forEach((d) => {
    let marker = null;
    if (d.hasCoords) {
      marker = createDealerMarker(d);
      marker.addTo(map);
      marker.on('click', () => select(d.slug, { from: 'map' }));
      marker.on('mouseover', () => hover(d.slug, true));
      marker.on('mouseout', () => hover(d.slug, false));
      marker.on('popupclose', () => {
        if (selectedSlug === d.slug) deselect();
      });
    }
    registry.set(d.slug, { dealer: d, marker, row: null });
  });

  // Ná de eerste layout-pass, zodat de containermaat klopt vóór het zoomen
  // (anders berekent fitBounds een zoomniveau voor een verkeerd formaat).
  currentFit = () => {
    updateOverlay();
    fitAllMarkers(map, [...registry.values()].map((r) => r.marker));
  };
  setTimeout(() => {
    map.invalidateSize();
    currentFit();
  }, 0);

  let selectedSlug = null;
  let userMarker = null;
  let currentOrder = sortByPlaats(dealers);

  const side = buildSide(sideEl, {
    onSearch: handleSearch,
    onLocate: handleLocate,
    onClear: handleClear,
  });

  function draw() {
    const rows = renderList(side.listEl, currentOrder, {
      onSelect: (slug) => select(slug, { from: 'list' }),
      onHover: hover,
    });
    rows.forEach((row, slug) => {
      const entry = registry.get(slug);
      if (entry) entry.row = row;
    });
    if (selectedSlug) {
      const entry = registry.get(selectedSlug);
      if (entry && entry.row) entry.row.classList.add('is-active');
    }
  }

  function hover(slug, on) {
    const entry = registry.get(slug);
    if (!entry) return;
    if (entry.marker && slug !== selectedSlug) setMarkerState(entry.marker, on ? 'hover' : '');
    if (entry.row) entry.row.classList.toggle('is-hover', on);
  }

  function select(slug, { from } = {}) {
    if (selectedSlug && selectedSlug !== slug) {
      const prev = registry.get(selectedSlug);
      if (prev) {
        if (prev.marker) setMarkerState(prev.marker, '');
        if (prev.row) prev.row.classList.remove('is-active');
      }
    }
    selectedSlug = slug;
    userInteracted = true; // een bewuste selectie mag niet worden weggeresized
    const entry = registry.get(slug);
    if (!entry) return;

    if (entry.row) {
      entry.row.classList.add('is-active');
      // Alleen scrollen als de lijst een eigen scrollcontainer is (desktop).
      // Op mobiel scrolt scrollIntoView de hele página en verdwijnt de kaart
      // uit beeld zodra je een pin aanklikt.
      const lijst = side.listEl;
      const scroltIntern =
        lijst.scrollHeight > lijst.clientHeight + 4 &&
        /(auto|scroll)/.test(getComputedStyle(lijst).overflowY);
      if (scroltIntern) {
        entry.row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    if (entry.marker) {
      setMarkerState(entry.marker, 'active');
      // Bij elke selectie licht inzoomen en de pin iets onder het midden
      // zetten, zodat de popup er volledig boven past — ook bij randpins
      // waar Leaflets autoPan vastloopt op de kaartbegrenzing.
      const doelZoom = Math.max(map.getZoom(), from === 'list' ? 12 : 10);
      flyToFree(map, entry.marker.getLatLng(), doelZoom, 80);
      if (from === 'list') entry.marker.openPopup();
    }
  }

  function deselect() {
    if (!selectedSlug) return;
    const entry = registry.get(selectedSlug);
    if (entry) {
      if (entry.marker) setMarkerState(entry.marker, '');
      if (entry.row) entry.row.classList.remove('is-active');
    }
    selectedSlug = null;
  }

  // Klik op de kaartachtergrond (niet op een pin) deselecteert alles.
  map.on('click', deselect);
  map.on('popupclose', () => {
    // popupclose op map-niveau vangt ook Esc; marker-specifieke handler doet de rest.
  });

  function applyLocation(point, labelHtml) {
    if (userMarker) userMarker.remove();
    userMarker = createUserMarker(point.lat, point.lng).addTo(map);

    currentOrder = sortByNearest(dealers, point.lat, point.lng);
    deselect();
    map.closePopup();
    draw();
    // Na hersortering hoort de dichtstbijzijnde meteen zichtbaar te zijn,
    // ook als de gebruiker al door de lijst gescrold had. Bewust instant:
    // smooth is op sommige containers/browsers een no-op en de lijst is
    // toch net opnieuw gerenderd.
    side.listEl.scrollTop = 0;
    side.setStatus(`Dichtstbijzijnde dealers bij ${labelHtml}`);
    side.setError('');
    currentFit = () => {
      updateOverlay();
      fitSearchResult(map, point, currentOrder);
    };
    currentFit();
  }

  async function handleSearch(q) {
    side.setBusy(true);
    let result;
    try {
      result = await geocode(q);
    } catch (err) {
      console.warn('[jbstone-map] Zoeken mislukt:', err);
      side.setError('Zoeken lukt even niet. Probeer het opnieuw.');
      side.setBusy(false);
      return;
    }
    side.setBusy(false);
    if (result === undefined) return; // afgebroken door nieuwere zoekopdracht
    if (result === null) {
      side.setError(`We konden '${q}' niet vinden. Probeer een plaatsnaam of postcode.`);
      return;
    }
    // Fouten bij het toepassen zijn géén zoekfout: niet als zodanig melden.
    try {
      applyLocation(result, `<strong>${esc(result.label)}</strong>`);
    } catch (err) {
      console.warn('[jbstone-map] Zoekresultaat toepassen mislukt:', err);
    }
  }

  // Teller voorkomt dat een oude, mislukte locatiepoging een foutmelding
  // over een nieuwere gelukte poging heen zet (dubbel tikken op mobiel).
  let locatePoging = 0;

  async function handleLocate() {
    const poging = ++locatePoging;
    side.setBusy(true);
    side.setError('');

    let pos = null;
    let fout = null;
    try {
      pos = await geolocate();
    } catch (err) {
      fout = err;
      // iOS geeft geregeld eenmalig "location unknown" terwijl een directe
      // tweede poging wél slaagt — stille retry (niet bij geweigerd).
      if (!err || err.code !== 1 /* PERMISSION_DENIED */) {
        try {
          pos = await geolocate();
          fout = null;
        } catch (err2) {
          fout = err2;
        }
      }
    }
    side.setBusy(false);
    if (poging !== locatePoging) return; // ingehaald door nieuwere poging

    if (!pos) {
      if (fout && fout.code === 1) {
        side.setError('Je hebt locatietoegang geweigerd. Vul hierboven je plaats of postcode in.');
      } else {
        side.setError('We konden je locatie niet bepalen. Vul je plaats of postcode in.');
      }
      return;
    }
    // Fouten bij het toepassen zijn géén locatiefout: niet als zodanig melden.
    try {
      applyLocation(pos, '<strong>jouw locatie</strong>');
    } catch (err) {
      console.warn('[jbstone-map] Locatie toepassen mislukt:', err);
    }
  }

  function handleClear() {
    if (userMarker) {
      userMarker.remove();
      userMarker = null;
    }
    currentOrder = sortByPlaats(dealers);
    deselect();
    map.closePopup();
    draw();
    side.listEl.scrollTop = 0;
    side.setStatus('');
    side.setError('');
    currentFit = () => {
      updateOverlay();
      fitAllMarkers(map, [...registry.values()].map((r) => r.marker));
    };
    currentFit();
  }

  draw();

  // Debug-handle voor support (niet documenteren richting klant).
  window.__JB_MAP__ = { map, registry };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
