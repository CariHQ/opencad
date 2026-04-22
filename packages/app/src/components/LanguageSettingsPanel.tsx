/**
 * LanguageSettingsPanel — the full-settings view of the language
 * picker. Shows every supported locale, marks the currently-detected
 * system language, and lets the user override it explicitly. The
 * choice persists to localStorage; a "Use system language" button
 * clears the override so future visits detect fresh.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import i18n, { SUPPORTED_LOCALES, DEFAULT_LOCALE, setLocale } from '../i18n';

/** Best-effort read of the navigator language(s), collapsed to a code
 *  that matches one of SUPPORTED_LOCALES (or 'en' if nothing matches). */
function detectSystemLocale(): string {
  const supported = new Set(SUPPORTED_LOCALES.map((l) => l.code));
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);
  for (const raw of candidates) {
    if (supported.has(raw)) return raw;
    const base = raw.split('-')[0];
    if (base && supported.has(base)) return base;
    // Chinese / Portuguese variants
    if (raw.startsWith('zh') && supported.has('zh-CN')) return 'zh-CN';
    if (raw.startsWith('pt') && supported.has('pt-BR')) return 'pt-BR';
  }
  return DEFAULT_LOCALE;
}

export function LanguageSettingsPanel(): React.ReactElement {
  const { t, i18n: hook } = useTranslation('common');
  const [current, setCurrent] = useState<string>(() => hook.language || DEFAULT_LOCALE);
  const [hasOverride, setHasOverride] = useState<boolean>(() => {
    try { return !!localStorage.getItem('opencad-locale'); } catch { return false; }
  });

  useEffect(() => {
    const onChange = (lc: string): void => setCurrent(lc);
    hook.on('languageChanged', onChange);
    return () => { hook.off('languageChanged', onChange); };
  }, [hook]);

  const systemLocale = useMemo(detectSystemLocale, []);

  const pick = async (lc: string): Promise<void> => {
    await setLocale(lc);
    setHasOverride(true);
  };

  const useSystem = async (): Promise<void> => {
    try { localStorage.removeItem('opencad-locale'); } catch { /* quota */ }
    setHasOverride(false);
    await setLocale(systemLocale);
  };

  return (
    <div className="language-settings-panel">
      <div className="language-settings-header">
        <Globe size={16} />
        <div>
          <h3 className="language-settings-title">
            {t('nav.settings', { defaultValue: 'Settings' })} · Language
          </h3>
          <p className="language-settings-hint">
            {hasOverride
              ? 'Your language choice is saved across sessions. Click "Use system language" to follow your OS setting instead.'
              : 'Detected from your browser. Pick any language to override — we’ll remember it next time.'}
          </p>
          {hasOverride && (
            <button
              type="button"
              className="language-settings-clear"
              onClick={() => { void useSystem(); }}
            >
              Use system language ({SUPPORTED_LOCALES.find((l) => l.code === systemLocale)?.native ?? systemLocale})
            </button>
          )}
        </div>
      </div>

      <ul className="language-settings-list" role="radiogroup" aria-label="Language">
        {SUPPORTED_LOCALES.map((l) => {
          const active = l.code === current;
          const isSystem = l.code === systemLocale;
          return (
            <li key={l.code}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                className={`language-settings-row${active ? ' is-active' : ''}`}
                onClick={() => { void pick(l.code); }}
              >
                <span className="language-settings-check">
                  {active && <Check size={14} />}
                </span>
                <span className="language-settings-native">{l.native}</span>
                <span className="language-settings-label">{l.label}</span>
                {isSystem && (
                  <span className="language-settings-system" title="Detected from your system">
                    System
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
