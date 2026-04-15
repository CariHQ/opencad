/**
 * WASM Geometry Kernel Loader
 * Loads OpenCASCADE-compiled WASM module with CPU fallback
 */

export interface WasmKernel {
  ready: boolean;
  union: (aPtr: number, bPtr: number) => number;
  subtract: (aPtr: number, bPtr: number) => number;
  intersect: (aPtr: number, bPtr: number) => number;
  fillet: (solidPtr: number, radius: number) => number;
}

type KernelMode = 'wasm' | 'cpu';

let kernelMode: KernelMode = 'cpu';
let wasmKernel: WasmKernel | null = null;

/**
 * Attempt to load the WASM kernel. Falls back silently to CPU mode if unavailable.
 */
export async function loadWasmKernel(wasmUrl?: string): Promise<KernelMode> {
  if (typeof WebAssembly === 'undefined') {
    kernelMode = 'cpu';
    return 'cpu';
  }

  try {
    const url = wasmUrl ?? '/opencad-geometry.wasm';
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch WASM: ${response.status}`);

    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {
      env: {
        memory: new WebAssembly.Memory({ initial: 256 }),
      },
    });

    wasmKernel = {
      ready: true,
      union: instance.exports.occt_union as (a: number, b: number) => number,
      subtract: instance.exports.occt_subtract as (a: number, b: number) => number,
      intersect: instance.exports.occt_intersect as (a: number, b: number) => number,
      fillet: instance.exports.occt_fillet as (s: number, r: number) => number,
    };

    kernelMode = 'wasm';
    return 'wasm';
  } catch {
    kernelMode = 'cpu';
    return 'cpu';
  }
}

export function getKernelMode(): KernelMode {
  return kernelMode;
}

export function isWasmAvailable(): boolean {
  return kernelMode === 'wasm' && wasmKernel !== null;
}
