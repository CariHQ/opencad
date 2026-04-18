/**
 * ViewportSplitControl
 * T-VP-001: Toggle buttons for switching between 1, 2, and 4 viewport panels.
 *
 * Renders three buttons with data-testid: "split-1", "split-2", "split-4".
 * The active button has aria-pressed="true".
 */
import React from 'react';
import type { ViewportCount } from './ViewportLayout';

interface ViewportSplitControlProps {
  activeCount: ViewportCount;
  onCountChange: (count: ViewportCount) => void;
}

const COUNTS: ViewportCount[] = [1, 2, 4];

const LABELS: Record<ViewportCount, string> = {
  1: '1 □',
  2: '2 □',
  4: '4 □',
};

export function ViewportSplitControl({
  activeCount,
  onCountChange,
}: ViewportSplitControlProps): React.ReactElement {
  return (
    <div className="viewport-split-control" style={{ display: 'flex', gap: 4 }}>
      {COUNTS.map((count) => (
        <button
          key={count}
          data-testid={`split-${count}`}
          aria-pressed={activeCount === count ? 'true' : 'false'}
          className={`viewport-control-btn${activeCount === count ? ' active' : ''}`}
          title={`${count === 1 ? 'Single' : count === 2 ? '2-up split' : '4-up quad'} view`}
          onClick={() => onCountChange(count)}
        >
          {LABELS[count]}
        </button>
      ))}
    </div>
  );
}
