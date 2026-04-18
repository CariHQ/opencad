import { useState, useCallback } from 'react';
import { getContextMenuItems, type ViewportType, type ElementContext, type ContextMenuGroup } from '../components/contextMenu/contextMenuItems';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuGroup;
}

const CLOSED: ContextMenuState = {
  visible: false, x: 0, y: 0,
  items: { radial: [], list: [] },
};

export function useContextMenu(viewport: ViewportType) {
  const [menu, setMenu] = useState<ContextMenuState>(CLOSED);

  const open = useCallback((
    x: number,
    y: number,
    elementContext: ElementContext,
  ) => {
    setMenu({
      visible: true,
      x, y,
      items: getContextMenuItems(viewport, elementContext),
    });
  }, [viewport]);

  const close = useCallback(() => setMenu(CLOSED), []);

  return { menu, open, close };
}
