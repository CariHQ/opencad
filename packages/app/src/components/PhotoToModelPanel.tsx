import React, { useRef } from 'react';

type PhotoToModelStatus = 'idle' | 'ready' | 'processing' | 'done' | 'error';

interface ExtractedGeometry {
  wallCount: number;
  estimatedArea: number;
}

interface PhotoToModelPanelProps {
  onUpload: (file: File) => void;
  onExtract: () => void;
  status?: PhotoToModelStatus;
  photoUrl?: string;
  extractedGeometry?: ExtractedGeometry;
}

export function PhotoToModelPanel({ onUpload, onExtract, status = 'idle', photoUrl, extractedGeometry }: PhotoToModelPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="photo-to-model-panel">
      <div className="panel-header">
        <span className="panel-title">Photo-to-Model</span>
      </div>

      <p className="photo-instructions">
        Upload a site photo to extract massing geometry and generate a 3D model. AI analyzes the photo to identify walls, floors, and openings.
      </p>

      <div
        className="photo-drop-zone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        role="region"
        aria-label="Photo upload zone"
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Uploaded site photo" className="photo-preview" style={{ maxWidth: '100%', maxHeight: 200 }} />
        ) : (
          <span className="drop-hint">Drop a photo here or click Upload to browse</span>
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
          aria-label="Upload photo"
          className="btn-upload"
          onClick={() => inputRef.current?.click()}
        >
          Upload Photo
        </button>

        {status === 'ready' && photoUrl && (
          <button
            aria-label="Extract massing geometry"
            className="btn-extract"
            onClick={onExtract}
          >
            Extract Massing
          </button>
        )}
      </div>

      {status === 'processing' && (
        <div className="photo-processing" role="status">
          <span className="spinner" />
          Analyzing photo…
        </div>
      )}

      {status === 'done' && extractedGeometry && (
        <div className="photo-results">
          <h4>Extracted Geometry</h4>
          <div className="result-row">
            <span>Walls detected:</span>
            <span>{extractedGeometry.wallCount} walls</span>
          </div>
          <div className="result-row">
            <span>Estimated area:</span>
            <span>{extractedGeometry.estimatedArea} m²</span>
          </div>
        </div>
      )}
    </div>
  );
}
