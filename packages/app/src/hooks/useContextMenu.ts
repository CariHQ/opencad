/**
 * useContextMenu — wires role-gated context menu into the viewport.
 *
 * Returns helpers to open / close the context menu and the current menu state.
 */
import { useState, useCallback } from 'react';
import { getContextMenuItems, type ContextMenuResult } from '../components/contextMenu/contextMenuDefs';
import { useRole } from './useRole';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuResult;
}

const EMPTY_RESULT: ContextMenuResult = { radial: [], list: [] };

export function useContextMenu(viewport = 'viewport') {
  const { can } = useRole();

  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    items: EMPTY_RESULT,
  });

  const open = useCallback(
    (x: number, y: number, elementContext: Record<string, unknown> = {}) => {
      const items = getContextMenuItems(viewport, elementContext, can);
      setState({ visible: true, x, y, items });
    },
    [can, viewport]
  );

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return { contextMenu: state, openContextMenu: open, closeContextMenu: close };
}
