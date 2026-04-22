import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';
import { detectClashes, ClashResult, ClashSeverity } from '../utils/clashDetection';

export function ClashDetectionPanel() {
  const { t } = useTranslation('panels');
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
        <span className="panel-title">{t('clash.title')}</span>
      </div>

      <div className="panel-body">
        <button
          className="btn-primary clash-run-btn"
          onClick={runDetection}
        >
          <Zap size={14} />
          {t('clash.runFull', { defaultValue: 'Run Clash Detection' })}
        </button>

        {clashes === null ? (
          <div className="clash-empty">
            <p>{t('clash.runHint', { defaultValue: 'Run detection to check for clashes between elements.' })}</p>
          </div>
        ) : clashes.length === 0 ? (
          <div className="clash-empty">
            <p>{t('clash.noClashes')}</p>
          </div>
        ) : (
          <div className="clash-results">
            <div className="clash-summary">{t('clash.clashes', { count: clashes.length, defaultValue: '{{count}} clash(es) found' })}</div>
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
                    {clash.severity === ClashSeverity.Hard
                      ? t('clash.hard', { defaultValue: 'Hard' })
                      : t('clash.soft', { defaultValue: 'Soft' })}
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
