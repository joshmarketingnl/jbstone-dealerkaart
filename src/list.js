import { esc } from './markers.js';

/**
 * Bouwt de rechterkolom: zoekveld + locatieknop, statusregel en dealerlijst.
 * Geeft handles terug waarmee index.js de onderdelen aanstuurt.
 */
export function buildSide(container, { onSearch, onLocate, onClear }) {
  container.classList.add('jb-side');
  container.innerHTML =
    `<form class="jb-search" novalidate>` +
    `<label class="jb-search__label" for="jb-search-input">Vind een dealer bij jou in de buurt</label>` +
    `<div class="jb-search__row">` +
    `<input id="jb-search-input" class="jb-search__input" type="text" ` +
    `placeholder="Plaats of postcode" autocomplete="postal-code" ` +
    `aria-label="Zoek op plaats of postcode">` +
    `<button type="submit" class="jb-search__btn">Zoek</button>` +
    `<button type="button" class="jb-search__locate" title="Gebruik mijn locatie" aria-label="Gebruik mijn locatie">` +
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>` +
    `</svg></button>` +
    `</div>` +
    `<p class="jb-search__error" role="alert" hidden></p>` +
    `</form>` +
    `<div class="jb-status" hidden>` +
    `<span class="jb-status__text"></span>` +
    `<button type="button" class="jb-status__clear">&times;&nbsp;wissen</button>` +
    `</div>` +
    `<div class="jb-list" role="list" aria-label="JB Stone dealers"></div>`;

  const form = container.querySelector('.jb-search');
  const input = container.querySelector('.jb-search__input');
  const errorEl = container.querySelector('.jb-search__error');
  const statusEl = container.querySelector('.jb-status');
  const statusText = container.querySelector('.jb-status__text');
  const listEl = container.querySelector('.jb-list');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return; // leeg veld: niets doen, geen foutmelding (PRD §7.5)
    onSearch(q);
  });
  container.querySelector('.jb-search__locate').addEventListener('click', onLocate);
  container.querySelector('.jb-status__clear').addEventListener('click', () => {
    input.value = '';
    onClear();
  });

  return {
    listEl,
    setError(msg) {
      errorEl.textContent = msg || '';
      errorEl.hidden = !msg;
    },
    setStatus(html) {
      if (html) {
        statusText.innerHTML = html;
        statusEl.hidden = false;
      } else {
        statusEl.hidden = true;
      }
    },
    setBusy(busy) {
      container.classList.toggle('is-busy', !!busy);
    },
  };
}

function distLabel(km) {
  if (km === null || km === undefined) return '';
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `ca. ${String(rounded).replace('.', ',')} km`;
}

/**
 * Rendert de dealerlijst. `dealers` bepaalt de volgorde;
 * rows worden opnieuw opgebouwd (16–50 items, geen performance-issue).
 * Geeft een Map slug → rij-element terug voor de kaart↔lijst-koppeling.
 */
export function renderList(listEl, dealers, { onSelect, onHover }) {
  listEl.innerHTML = '';
  const rowBySlug = new Map();

  dealers.forEach((d) => {
    const row = document.createElement('div');
    row.className = 'jb-list__item';
    row.setAttribute('role', 'listitem');
    row.tabIndex = 0;
    row.dataset.slug = d.slug;
    row.innerHTML =
      `<div class="jb-list__main">` +
      `<h3 class="jb-list__plaats">${esc(d.plaats)}</h3>` +
      `<div class="jb-list__name">${esc(d.name)}</div>` +
      `</div>` +
      `<div class="jb-list__meta">` +
      `<span class="jb-list__dist">${distLabel(d.distanceKm)}</span>` +
      (d.url
        ? `<a class="jb-list__arrow" href="${esc(d.url)}" aria-label="Bekijk ${esc(d.name)} in ${esc(d.plaats)}">` +
          `<svg width="14" height="22" viewBox="0 0 14 22" fill="none" aria-hidden="true">` +
          `<path d="M2 2l9 9-9 9" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
          `</svg></a>`
        : '') +
      `</div>`;

    // Rij = selecteren; pijl = navigeren, mag de selectie niet triggeren (PRD §7.7).
    const arrow = row.querySelector('.jb-list__arrow');
    if (arrow) arrow.addEventListener('click', (e) => e.stopPropagation());

    row.addEventListener('click', () => onSelect(d.slug));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(d.slug);
      }
    });
    row.addEventListener('mouseenter', () => onHover(d.slug, true));
    row.addEventListener('mouseleave', () => onHover(d.slug, false));

    listEl.appendChild(row);
    rowBySlug.set(d.slug, row);
  });

  return rowBySlug;
}
