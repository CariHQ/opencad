/**
 * OPFS (Origin Private File System) wrapper.
 *
 * A thin async key/value layer over navigator.storage.getDirectory() with
 * a no-op fallback for environments that don't implement it (SSR, older
 * browsers, test runners). Use for large blobs the document layer doesn't
 * want to embed directly — exported IFCs, cached point-cloud CSVs, plugin
 * code — so IndexedDB and localStorage stay free for small structured data.
 */

const DIR_NAME = 'opencad';

let _rootPromise: Promise<FileSystemDirectoryHandle | null> | null = null;

async function getRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (_rootPromise) return _rootPromise;
  _rootPromise = (async () => {
    try {
      const nav = globalThis.navigator as Navigator & {
        storage?: { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
      };
      if (!nav?.storage?.getDirectory) return null;
      const origin = await nav.storage.getDirectory();
      return await origin.getDirectoryHandle(DIR_NAME, { create: true });
    } catch {
      return null;
    }
  })();
  return _rootPromise;
}

/** Returns true when OPFS is usable — false on older browsers / SSR. */
export async function opfsAvailable(): Promise<boolean> {
  return (await getRoot()) !== null;
}

/** Write a string (or Blob) to OPFS under `key`. Returns true on success. */
export async function opfsWrite(key: string, data: string | Blob): Promise<boolean> {
  try {
    const root = await getRoot();
    if (!root) return false;
    const handle = await root.getFileHandle(sanitise(key), { create: true });
    // FileSystemFileHandle.createWritable is present in Chrome/Safari but not
    // in every polyfill — fall back to null-op if missing.
    const writable = await (handle as FileSystemFileHandle & {
      createWritable: () => Promise<FileSystemWritableFileStream>;
    }).createWritable();
    await writable.write(data);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

/** Read a string from OPFS. Returns null when absent or unavailable. */
export async function opfsRead(key: string): Promise<string | null> {
  try {
    const root = await getRoot();
    if (!root) return null;
    const handle = await root.getFileHandle(sanitise(key), { create: false });
    const file = await handle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

/** Delete an OPFS entry. No-op if missing or unavailable. */
export async function opfsDelete(key: string): Promise<void> {
  try {
    const root = await getRoot();
    if (!root) return;
    await root.removeEntry(sanitise(key));
  } catch {
    /* ignore */
  }
}

/** List every entry name in the OPFS opencad/ directory. */
export async function opfsList(): Promise<string[]> {
  try {
    const root = await getRoot();
    if (!root) return [];
    const out: string[] = [];
    // AsyncIterable<[name, handle]> — typed loosely for forward compat.
    const entries = (root as FileSystemDirectoryHandle & {
      entries?: () => AsyncIterable<[string, FileSystemHandle]>;
    }).entries?.();
    if (!entries) return out;
    for await (const [name] of entries) out.push(name);
    return out;
  } catch {
    return [];
  }
}

/** Strip path separators — OPFS keys can't contain slashes. */
function sanitise(key: string): string {
  return key.replace(/[\/\\]/g, '_');
}
