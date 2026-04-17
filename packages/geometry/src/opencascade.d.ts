/**
 * Type shim for opencascade.js
 * The package ships no TypeScript declarations; we declare the module as
 * returning `any` so the rest of the codebase stays strictly-typed while
 * the OCCT API surface remains untyped (it's 100k+ entries).
 */
declare module 'opencascade.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function initOpenCascade(): Promise<any>;
}
