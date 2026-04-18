import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { detectClashes, ClashResult, ClashSeverity } from '../utils/clashDetection';

export function ClashDetectionPanel() {
  const { document: doc, selectedIds: _selectedIds, setSelectedIds } = useDocumentStore();
  const [clashes, setClashes] = useState<ClashResult[] | null>(null);

  function runDetection() {
    if (!doc) {
      setClashes([]);
      return;
    }
    const elements = Object.values(doc.content.elements);
    setClashes(detectClashes(elements));
  }

  function handleClashClick(clash: ClashResult) {
    setSelectedIds([clash.elementAId, clash.elementBId]);
  }

  return (
    <div className="clash-detection-panel panel">
      <div className="panel-header">
        <span className="panel-title">Clash Detection</span>
      </div>

      <div className="panel-body">
        <button
          className="btn-primary clash-run-btn"
          onClick={runDetection}
        >
          <Zap size={14} />
          Run Clash Detection
        </button>

        {clashes === null ? (
          <div className="clash-empty">
            <p>Run detection to check for clashes between elements.</p>
          </div>
        ) : clashes.length === 0 ? (
          <div className="clash-empty">
            <p>0 clashes detected — model is clear.</p>
          </div>
        ) : (
          <div className="clash-results">
            <div className="clash-summary">{clashes.length} clash{clashes.length !== 1 ? 'es' : ''} found</div>
            <ul className="clash-list">
              {clashes.map((clash) => (
                <li
                  key={clash.id}
                  className={`clash-item clash-${clash.severity}`}
                  data-clash-id={clash.id}
                  onClick={() => handleClashClick(clash)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleClashClick(clash)}
                >
                  <span className={`clash-badge ${clash.severity === ClashSeverity.Hard ? 'badge-hard' : 'badge-soft'}`}>
                    {clash.severity === ClashSeverity.Hard ? 'Hard' : 'Soft'}
                  </span>
                  <span className="clash-description">{clash.description}</span>
                  <span className="clash-location">
                    ({Math.round(clash.location.x)}, {Math.round(clash.location.y)}, {Math.round(clash.location.z)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
