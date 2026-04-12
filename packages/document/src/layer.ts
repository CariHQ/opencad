/**
 * Layer Operations
 */

import { LayerSchema } from './types';

export function createLayer(params: {
  name: string;
  color: string;
  visible?: boolean;
  locked?: boolean;
  order?: number;
}): LayerSchema {
  return {
    id: crypto.randomUUID(),
    name: params.name,
    color: params.color,
    visible: params.visible ?? true,
    locked: params.locked ?? false,
    order: params.order ?? 0,
  };
}

export function updateLayerColor(layer: LayerSchema, color: string): LayerSchema {
  return { ...layer, color };
}

export function updateLayerVisibility(layer: LayerSchema, visible: boolean): LayerSchema {
  return { ...layer, visible };
}

export function updateLayerLock(layer: LayerSchema, locked: boolean): LayerSchema {
  return { ...layer, locked };
}

export function reorderLayers(
  layers: Record<string, LayerSchema>,
  layerIds: string[]
): Record<string, LayerSchema> {
  const reordered: Record<string, LayerSchema> = {};

  layerIds.forEach((id, index) => {
    if (layers[id]) {
      reordered[id] = { ...layers[id], order: index };
    }
  });

  return reordered;
}
