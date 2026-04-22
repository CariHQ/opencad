import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

type PhotoToModelStatus = 'idle' | 'ready' | 'processing' | 'done' | 'error';

interface ExtractedGeometry {
  wallCount: number;
  estimatedArea: number;
}

interface PhotoToModelPanelProps {
  onUpload?: (file: File) => void;
  onExtract?: () => void;
  status?: PhotoToModelStatus;
  photoUrl?: string;
  extractedGeometry?: ExtractedGeometry;
}

export function PhotoToModelPanel({ onUpload, onExtract, status = 'idle', photoUrl, extractedGeometry }: PhotoToModelPanelProps = {}) {
  const { t } = useTranslation('panels');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload?.(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload?.(file);
  };

  return (
    <div className="photo-to-model-panel">
      <div className="panel-header">
        <span className="panel-title">{t('photo.fullTitle', { defaultValue: 'Photo-to-Model' })}</span>
      </div>

      <p className="photo-instructions">
        {t('photo.instructions', { defaultValue: 'Upload a site photo to extract massing geometry and generate a 3D model. AI analyzes the photo to identify walls, floors, and openings.' })}
      </p>

      <div
        className="photo-drop-zone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        role="region"
        aria-label={t('photo.uploadZone', { defaultValue: 'Photo upload zone' })}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={t('photo.uploadedAlt', { defaultValue: 'Uploaded site photo' })} className="photo-preview" style={{ maxWidth: '100%', maxHeight: 200 }} />
        ) : (
          <span className="drop-hint">{t('photo.dropHint', { defaultValue: 'Drop a photo here or click Upload to browse' })}</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="photo-actions">
        <button
          aria-label={t('photo.uploadAria', { defaultValue: 'Upload photo' })}
          className="btn-upload"
          onClick={() => inputRef.current?.click()}
        >
          {t('photo.upload', { defaultValue: 'Upload Photo' })}
        </button>

        {status === 'ready' && photoUrl && (
          <button
            aria-label={t('photo.extractAria', { defaultValue: 'Extract massing geometry' })}
            className="btn-extract"
            onClick={() => onExtract?.()}
          >
            {t('photo.extract', { defaultValue: 'Extract Massing' })}
          </button>
        )}
      </div>

      {status === 'processing' && (
        <div className="photo-processing" role="status">
          <span className="spinner" />
          {t('photo.analyzing', { defaultValue: 'Analyzing photo…' })}
        </div>
      )}

      {status === 'done' && extractedGeometry && (
        <div className="photo-results">
          <h4>{t('photo.extractedHeading', { defaultValue: 'Extracted Geometry' })}</h4>
          <div className="result-row">
            <span>{t('photo.wallsDetected', { defaultValue: 'Walls detected:' })}</span>
            <span>{t('photo.wallsCount', { count: extractedGeometry.wallCount, defaultValue: '{{count}} walls' })}</span>
          </div>
          <div className="result-row">
            <span>{t('photo.estimatedArea', { defaultValue: 'Estimated area:' })}</span>
            <span>{extractedGeometry.estimatedArea} m²</span>
          </div>
        </div>
      )}
    </div>
  );
}
