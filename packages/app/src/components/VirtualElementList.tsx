import React, { useMemo } from 'react';

interface VirtualItem {
  id: string;
  type: string;
  label: string;
}

interface VirtualElementListProps {
  items: VirtualItem[];
  itemHeight: number;
  visibleCount: number;
  scrollOffset?: number;
  onItemClick?: (item: VirtualItem) => void;
}

const BUFFER = 5;

export function VirtualElementList({
  items,
  itemHeight,
  visibleCount,
  scrollOffset = 0,
  onItemClick,
}: VirtualElementListProps) {
  const totalHeight = items.length * itemHeight;

  const { startIndex, visibleItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollOffset / itemHeight) - BUFFER);
    const end = Math.min(items.length, start + visibleCount + BUFFER * 2);
    return {
      startIndex: start,
      visibleItems: items.slice(start, end),
    };
  }, [items, itemHeight, visibleCount, scrollOffset]);

  return (
    <div className="virtual-list" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        className="virtual-list-spacer"
        style={{ height: totalHeight, position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />
      <div
        className="virtual-list-content"
        style={{ position: 'relative', transform: `translateY(${startIndex * itemHeight}px)` }}
      >
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="virtual-list-item"
            style={{ height: itemHeight, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}
            onClick={() => onItemClick?.(item)}
            role="listitem"
          >
            <span className="item-type-badge" style={{ fontSize: 10, opacity: 0.7 }}>{item.type}</span>
            <span className="item-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
