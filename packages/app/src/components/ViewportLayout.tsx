/**
 * ViewportLayout
 * T-VP-001: Renders 1, 2, or 4 viewport panels in a CSS grid.
 *
 * count=1  → single full-size panel
 * count=2  → side-by-side (50/50 horizontal split)
 * count=4  → 2×2 grid
 */
import React from 'react';

export type ViewportCount = 1 | 2 | 4;

interface ViewportLayoutProps {
  count: ViewportCount;
  children: (index: number) => React.ReactNode;
}

const gridStyles: Record<ViewportCount, React.CSSProperties> = {
  1: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr',
    width: '100%',
    height: '100%',
  },
  2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr',
    width: '100%',
    height: '100%',
  },
  4: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr',
    width: '100%',
    height: '100%',
  },
};

export function ViewportLayout({ count, children }: ViewportLayoutProps): React.ReactElement {
  const slots = Array.from({ length: count }, (_, i) => i);

  return (
    <div style={gridStyles[count]}>
      {slots.map((index) => (
        <div key={index} style={{ overflow: 'hidden', position: 'relative' }}>
          {children(index)}
        </div>
      ))}
    </div>
  );
}
