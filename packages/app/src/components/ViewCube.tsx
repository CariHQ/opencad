import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
  return (
    <div className="view-cube" aria-label={t('viewport.viewCubeAria', { defaultValue: 'View orientation cube' })}>
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
