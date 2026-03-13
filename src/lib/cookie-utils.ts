/** Cookie consent utilities — separate from CookieConsent component for clean imports and code-splitting */

import { logError } from './logger';

const STORAGE_KEY = 'pptides_cookie_consent';

export interface CookiePreferences {
  essential: boolean;
  optional: boolean;
}

export function getCookiePreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw === 'accepted') return { essential: true, optional: true };
    if (raw === 'rejected') return { essential: true, optional: false };
    return JSON.parse(raw) as CookiePreferences;
  } catch (e) {
    logError('[cookie-utils] getCookiePreferences failed:', e);
    return null;
  }
}

export function hasOptionalConsent(): boolean {
  const prefs = getCookiePreferences();
  return prefs?.optional === true;
}

export { STORAGE_KEY as COOKIE_CONSENT_STORAGE_KEY };
