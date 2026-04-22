/**
 * Language selector (T-I18N-008).
 *
 * Small <select> that lists every entry from SUPPORTED_LOCALES and
 * switches the active UI language via setLocale. The selected language
 * persists to localStorage so the next visit lands in the same
 * language without flashing English first.
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, setLocale } from '../i18n';

export function LanguageSelector(): React.ReactElement {
  const { t, i18n } = useTranslation('common');
  const [current, setCurrent] = useState<string>(() => i18n.language || 'en');

  useEffect(() => {
    const onChange = (lc: string): void => setCurrent(lc);
    i18n.on('languageChanged', onChange);
    return () => { i18n.off('languageChanged', onChange); };
  }, [i18n]);

  const handle = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    await setLocale(e.target.value);
  };

  return (
    <select
      className="language-selector"
      aria-label={t('language.aria', { defaultValue: 'Language' })}
      value={current}
      onChange={(e) => { void handle(e); }}
    >
      {SUPPORTED_LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.native}
        </option>
      ))}
    </select>
  );
}
