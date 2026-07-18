/* global L */

/** HTML-escape voor popup-content. */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Druppel-pin, 32×42. Kleur via CSS (currentColor), witte kern vast.
const PIN_SVG =
  '<svg width="32" height="42" viewBox="0 0 32 42" style="overflow:visible" aria-hidden="true">' +
  '<path class="jb-pin__body" d="M16 1C7.7 1 1 7.7 1 16c0 10.5 15 25 15 25s15-14.5 15-25C31 7.7 24.3 1 16 1z" fill="currentColor"/>' +
  '<circle cx="16" cy="15.5" r="5.5" fill="#fff"/>' +
  '</svg>';

// Marker voor "jouw locatie": leisteenkleurige stip met witte ring.
const USER_SVG =
  '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">' +
  '<circle cx="11" cy="11" r="9" fill="#4C536E" stroke="#fff" stroke-width="3"/>' +
  '</svg>';

export function routeUrl(dealer) {
  return `https://www.google.com/maps/search/?api=1&query=${dealer.lat},${dealer.lng}`;
}

function popupHtml(dealer) {
  const tel = dealer.tel
    ? `<a class="jb-popup__tel" href="tel:${esc(dealer.tel.replace(/\s/g, ''))}">${esc(dealer.tel)}</a>`
    : '';
  const dealerLink = dealer.url
    ? `<a class="jb-popup__btn" href="${esc(dealer.url)}">Bekijk dealer&nbsp;&rsaquo;</a>`
    : '';
  // Het CMS heeft één adresveld (straat + postcode + plaats in één string);
  // lege delen niet met een losse komma tonen.
  const adres = [dealer.straat, dealer.postcode].filter(Boolean).join(', ');
  return (
    `<div class="jb-popup">` +
    `<strong class="jb-popup__name">${esc(dealer.name)}</strong>` +
    `<span class="jb-popup__plaats">${esc(dealer.plaats)}</span>` +
    (adres ? `<span class="jb-popup__adres">${esc(adres)}</span>` : '') +
    tel +
    `<div class="jb-popup__actions">` +
    dealerLink +
    `<a class="jb-popup__btn jb-popup__btn--outline" href="${esc(dealer.route || routeUrl(dealer))}" target="_blank" rel="noopener">Route</a>` +
    `</div></div>`
  );
}

export function createDealerMarker(dealer) {
  const icon = L.divIcon({
    className: 'jb-pin-wrap',
    html: `<div class="jb-pin">${PIN_SVG}</div>`,
    iconSize: [32, 42],
    // Anker op de púnt van de druppel, niet het midden (PRD §7.3).
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
  });
  const marker = L.marker([dealer.lat, dealer.lng], {
    icon,
    title: `${dealer.name}, ${dealer.plaats}`,
    keyboard: true,
    riseOnHover: true,
  });
  marker.bindPopup(popupHtml(dealer), {
    closeButton: true,
    maxWidth: 260,
    // autoPan uit: de widget centreert zelf (flyToFree met popup-offset).
    // autoPan zou die animatie direct afbreken én loopt bij randpins vast
    // op de kaartbegrenzing.
    autoPan: false,
  });
  return marker;
}

export function createUserMarker(lat, lng) {
  const icon = L.divIcon({
    className: 'jb-pin-wrap',
    html: `<div class="jb-userpin">${USER_SVG}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
  const marker = L.marker([lat, lng], { icon, zIndexOffset: -100 });
  marker.bindPopup('<div class="jb-popup"><strong class="jb-popup__name">Jouw locatie</strong></div>', {
    closeButton: true,
    maxWidth: 200,
  });
  return marker;
}

/** Zet de visuele toestand van een pin: '', 'hover' of 'active'. */
export function setMarkerState(marker, state) {
  const el = marker.getElement();
  if (!el) return;
  const pin = el.querySelector('.jb-pin');
  if (!pin) return;
  pin.classList.toggle('is-hover', state === 'hover');
  pin.classList.toggle('is-active', state === 'active');
  marker.setZIndexOffset(state === 'active' ? 1000 : state === 'hover' ? 500 : 0);
}
