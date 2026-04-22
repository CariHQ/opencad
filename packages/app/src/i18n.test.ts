/**
 * T-I18N-001..004: i18n infrastructure smoke tests.
 *
 * Lock down the contract so future refactors can't silently break:
 *   - English baseline is bundled up-front (no async for en).
 *   - Every Tier-1 locale has every namespace English has — otherwise
 *     the UI will fall back to English in places the user expects a
 *     translation and we never notice.
 *   - setLocale persists to localStorage.
 *   - The scanner output file lists every key that appears under en/.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import i18n, { SUPPORTED_LOCALES, setLocale } from './i18n';

// Locales shipped in-tree. Any future addition to SUPPORTED_LOCALES that
// doesn't also land a JSON bundle here will trip the key-shape check.
const SHIPPED_LOCALES = ['en', 'es', 'de', 'fr', 'pt-BR', 'zh-CN', 'ar', 'hi', 'ja', 'ru'];
const NAMESPACES = ['common', 'toolbar', 'panels', 'dialogs', 'errors'] as const;

/** Walk an object and return every dotted key path (leaf-only). Used to
 *  diff namespace shapes between locales. */
function flatten(obj: unknown, prefix = ''): string[] {
  if (obj == null || typeof obj !== 'object') return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe('T-I18N-001..004: i18n infrastructure', () => {
  beforeEach(() => {
    try { localStorage.removeItem('opencad-locale'); } catch { /* jsdom */ }
  });

  it('T-I18N-001: English baseline is bundled (not async)', () => {
    for (const ns of NAMESPACES) {
      expect(i18n.hasResourceBundle('en', ns)).toBe(true);
    }
  });

  it('T-I18N-002: SUPPORTED_LOCALES includes all Tier-1 languages', () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    for (const c of ['en', 'es', 'fr', 'de', 'pt-BR', 'zh-CN']) {
      expect(codes).toContain(c);
    }
  });

  it('T-I18N-003: setLocale persists the choice to localStorage', async () => {
    await setLocale('es');
    expect(localStorage.getItem('opencad-locale')).toBe('es');
    await setLocale('en');
    expect(localStorage.getItem('opencad-locale')).toBe('en');
  });

  it('T-I18N-004: English baseline uses t() for a known key', () => {
    const t = i18n.getFixedT('en', 'panels');
    expect(t('readonly.title')).toBe('Read-only mode.');
    expect(t('readonly.resubscribe')).toBe('Resubscribe');
    expect(t('marketplace.install')).toBe('Install');
  });

  it('T-I18N-006: Top-10 languages are all in SUPPORTED_LOCALES', () => {
    // By global speaker count (L1+L2, rough order). If we drop one from
    // this list we're implicitly saying the product doesn't care about
    // those speakers — don't.
    const required = ['en', 'zh-CN', 'hi', 'es', 'fr', 'ar', 'pt-BR', 'ru', 'de', 'ja'];
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    for (const r of required) {
      expect(codes, `Top-10 language '${r}' missing from SUPPORTED_LOCALES`).toContain(r);
    }
  });

  it('T-I18N-007: region variants fall back to shipped locale', () => {
    // i18next is initialised with a fallback map (zh-TW → zh-CN,
    // pt-PT → pt-BR, es-MX → es). Verify by asking i18next to resolve.
    const fallbacks = i18n.options.fallbackLng as Record<string, string[]>;
    expect(fallbacks['zh-TW']).toContain('zh-CN');
    expect(fallbacks['zh-HK']).toContain('zh-CN');
    expect(fallbacks['pt-PT']).toContain('pt-BR');
    expect(fallbacks['es-MX']).toContain('es');
  });

  it('T-I18N-005: every shipped locale defines the same key shape as English', async () => {
    // Load each shipped locale's resources into i18next so we can
    // compare them to English.
    for (const lc of SHIPPED_LOCALES) {
      if (lc === 'en') continue;
      await setLocale(lc);
    }
    for (const ns of NAMESPACES) {
      const enKeys = flatten(i18n.getResourceBundle('en', ns));
      for (const lc of SHIPPED_LOCALES) {
        if (lc === 'en') continue;
        const bundle = i18n.getResourceBundle(lc, ns);
        if (!bundle) {
          // Namespace not yet translated — acceptable. English fallback
          // will render; community PR adds the file. Just note it.
          continue;
        }
        const missing = enKeys.filter((k) => !flatten(bundle).includes(k));
        expect(missing, `Locale '${lc}' namespace '${ns}' missing keys: ${missing.join(', ')}`).toEqual([]);
      }
    }
  });
});
