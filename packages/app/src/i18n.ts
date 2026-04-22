/**
 * i18n bootstrap (T-I18N-002).
 *
 * Initialises react-i18next with:
 *   - The English baseline bundled up-front so the app renders before
 *     any async locale load finishes.
 *   - Non-English locales lazy-loaded via dynamic import() so they
 *     don't bloat the initial JS bundle. A 30–50 KB hit per language
 *     is fine if the user opts in, but it shouldn't be forced on the
 *     99% that are English-default.
 *   - Language detection: URL ?lang= → localStorage → navigator → 'en'.
 *     Persists the chosen language back to localStorage so the next
 *     visit doesn't re-prompt.
 *
 * Namespace layout mirrors the folder structure under src/locales/<lc>/:
 *   - common    app-wide strings (actions, nav, status)
 *   - toolbar   ToolShelf tool labels
 *   - panels    Navigator, Billing, Marketplace, ReadOnlyBanner etc.
 *   - dialogs   Auth, new-project, confirm-delete
 *   - errors    user-facing error copy
 *
 * Adding a new locale: drop a folder under src/locales/<lc>/ with JSON
 * files that mirror the English namespaces and add the code to
 * SUPPORTED_LOCALES below. The dynamic import path in loadBundle is the
 * only other place the new locale needs to be referenced.
 */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enCommon  from './locales/en/common.json';
import enToolbar from './locales/en/toolbar.json';
import enPanels  from './locales/en/panels.json';
import enDialogs from './locales/en/dialogs.json';
import enErrors  from './locales/en/errors.json';

/** Locales the UI actively offers in the language picker. */
export const SUPPORTED_LOCALES: { code: string; label: string; native: string }[] = [
  { code: 'en',    label: 'English',             native: 'English' },
  { code: 'es',    label: 'Spanish',             native: 'Español' },
  { code: 'fr',    label: 'French',              native: 'Français' },
  { code: 'de',    label: 'German',              native: 'Deutsch' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', native: 'Português (BR)' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', native: '简体中文' },
];

export const DEFAULT_LOCALE = 'en';

const NAMESPACES = ['common', 'toolbar', 'panels', 'dialogs', 'errors'] as const;
type Namespace = (typeof NAMESPACES)[number];

/** Lazy-load a locale's namespaces into i18next. English is the baseline
 *  and is loaded synchronously at init, so only non-English locales pass
 *  through here. No-op if the bundle is already registered. */
async function loadBundle(lc: string): Promise<void> {
  if (lc === 'en') return;
  if (i18n.hasResourceBundle(lc, 'common')) return;

  // Dynamic import keeps non-default locales out of the initial bundle.
  // Each file loads on demand and i18next caches the result internally.
  const loaders: Record<Namespace, () => Promise<{ default: Record<string, unknown> }>> = {
    common:  () => import(`./locales/${lc}/common.json`),
    toolbar: () => import(`./locales/${lc}/toolbar.json`),
    panels:  () => import(`./locales/${lc}/panels.json`),
    dialogs: () => import(`./locales/${lc}/dialogs.json`),
    errors:  () => import(`./locales/${lc}/errors.json`),
  };

  await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = await loaders[ns]();
        i18n.addResourceBundle(lc, ns, mod.default, true, true);
      } catch {
        // Locale may not have this namespace translated yet — silently
        // fall back to English for those keys via i18next's fallbackLng.
      }
    }),
  );
}

/** Switch the active UI language. Lazy-loads the bundle if needed and
 *  persists the choice to localStorage so the next visit is instant. */
export async function setLocale(lc: string): Promise<void> {
  await loadBundle(lc);
  await i18n.changeLanguage(lc);
  try { localStorage.setItem('opencad-locale', lc); } catch { /* quota */ }
}

// ─── Initialise ──────────────────────────────────────────────────────────────

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // English baseline bundled at build time so the first paint has
    // strings without waiting for any network/dynamic import.
    resources: {
      en: {
        common: enCommon,
        toolbar: enToolbar,
        panels: enPanels,
        dialogs: enDialogs,
        errors: enErrors,
      },
    },
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      // URL > localStorage > navigator
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'opencad-locale',
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false, // we already bundle EN — no render gap to cover
    },
  });

// If the detector landed us on a non-English locale, eagerly load its
// bundle in the background so the next render reads the real strings
// instead of the English fallback.
const detected = i18n.language;
if (detected && detected !== 'en') {
  void loadBundle(detected).then(() => i18n.reloadResources(detected));
}

export default i18n;
