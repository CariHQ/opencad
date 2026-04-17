import { type ReactElement } from 'react';
import { type ViewPreset } from '../hooks/useThreeViewport';

interface ViewCubeProps {
  setViewPreset: (preset: ViewPreset) => void;
}

interface FaceConfig {
  preset: ViewPreset;
  label: string;
}

const FACES: FaceConfig[] = [
  { preset: 'top', label: 'TOP' },
  { preset: 'front', label: 'FRONT' },
  { preset: 'right', label: 'RIGHT' },
  { preset: '3d', label: '3D' },
];

export function ViewCube({ setViewPreset }: ViewCubeProps): ReactElement {
  return (
    <div className="view-cube" aria-label="View orientation cube">
      {FACES.map(({ preset, label }) => (
        <button
          key={preset}
          className={`view-cube-face view-cube-face--${preset}`}
          aria-label={`Set view to ${preset}`}
          onClick={() => setViewPreset(preset)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
