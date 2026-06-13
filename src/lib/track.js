// Conversion tracking + store-link attribution.
//
// Every download/signup CTA on the site funnels through here so each
// placement is measurable in GA4 (event: cta_click / store_click) and in the
// store consoles:
//  - Google Play: the `referrer` param survives install and shows up in the
//    Play Console acquisition reports (utm_source=ozly_web).
//  - Apple: `ct` is the campaign token. It only feeds App Analytics once the
//    provider token (`pt=`) is set — grab it in App Store Connect →
//    Analytics → Acquisition → Campaigns and fill APPLE_PROVIDER_TOKEN.
//    Until then GA4 click events are the source of truth.

const APPLE_PROVIDER_TOKEN = ""; // e.g. "121234567" — from App Store Connect

export const APP_STORE_BASE = "https://apps.apple.com/au/app/ozly/id6760398649";
export const PLAY_STORE_BASE =
  "https://play.google.com/store/apps/details?id=com.augusto.ozly";

export function appStoreUrl(campaign) {
  const params = new URLSearchParams({ ct: campaign, mt: "8" });
  if (APPLE_PROVIDER_TOKEN) params.set("pt", APPLE_PROVIDER_TOKEN);
  return `${APP_STORE_BASE}?${params}`;
}

export function playStoreUrl(campaign) {
  const referrer = `utm_source=ozly_web&utm_medium=website&utm_campaign=${campaign}`;
  return `${PLAY_STORE_BASE}&referrer=${encodeURIComponent(referrer)}`;
}

/** GA4 event — no-op when gtag is blocked (ad blockers, GDPR tools). */
export function trackEvent(name, params = {}) {
  try {
    window.gtag?.("event", name, params);
  } catch {
    /* never break the UI over analytics */
  }
}

export function trackStoreClick(store, campaign, lang) {
  trackEvent("store_click", { store, campaign, lang });
}

export function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Direct-to-store URL for the visitor's device, or null on desktop (where
 * the caller should fall back to the #download badges instead).
 */
export function deviceStoreUrl(campaign) {
  if (isIOS()) return { store: "app_store", url: appStoreUrl(campaign) };
  if (isAndroid()) return { store: "google_play", url: playStoreUrl(campaign) };
  return null;
}
