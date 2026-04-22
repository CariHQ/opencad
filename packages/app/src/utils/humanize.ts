import type { TFunction } from 'i18next';

/**
 * Converts a camelCase / PascalCase identifier into a space-separated,
 * title-cased label: "StartX" → "Start X", "ElevationOffset" → "Elevation Offset".
 */
export function humanizeLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Looks up a translated label for a property/schedule field key.
 * Falls back to humanizeLabel when no translation exists.
 *
 * Expects the caller's `t` to be bound to the `panels` namespace so keys
 * like `field.startx` resolve against `en/panels.json`.
 */
export function translateFieldLabel(t: TFunction, key: string): string {
  const lookup = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return t(`field.${lookup}`, { defaultValue: humanizeLabel(key) }) as string;
}
