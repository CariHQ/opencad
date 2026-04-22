import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BCFTopic, BCFStatus, BCFPriority } from '@opencad/document';

export type { BCFTopic, BCFStatus, BCFPriority };

interface BCFPanelProps {
  initialTopics?: BCFTopic[];
  onImport?: (file: File) => void;
  onExport?: (topics: BCFTopic[]) => void;
  onSelectTopic?: (topic: BCFTopic) => void;
}

const STATUS_COLORS: Record<BCFStatus, string> = {
  Open: '#e74c3c',
  'In Progress': '#f39c12',
  Resolved: '#27ae60',
  Closed: '#95a5a6',
};

const PRIORITY_LABELS: Record<BCFPriority, string> = {
  Critical: 'Critical',
  High: 'High',
  Normal: 'Normal',
  Low: 'Low',
};

export function BCFPanel({ initialTopics = [], onImport, onExport, onSelectTopic }: BCFPanelProps = {}) {
  const { t } = useTranslation('panels');
  const [topics] = useState<BCFTopic[]>(initialTopics);

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bcf,.bcfzip';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onImport?.(file);
    };
    input.click();
  };

  return (
    <div className="bcf-panel">
      <div className="panel-header">
        <span className="panel-title">{t('bcf.title')}</span>
      </div>
      <div className="bcf-actions">
        <button
          aria-label={t('bcf.import', { defaultValue: 'Import BCF' })}
          className="btn-import-bcf"
          onClick={handleImportClick}
        >
          {t('bcf.import', { defaultValue: 'Import BCF' })}
        </button>
        <button
          aria-label={t('bcf.export', { defaultValue: 'Export BCF' })}
          className="btn-export-bcf"
          onClick={() => onExport?.(topics)}
        >
          {t('bcf.export', { defaultValue: 'Export BCF' })}
        </button>
      </div>

      {topics.length === 0 ? (
        <div className="bcf-empty">{t('bcf.emptyDetail', { defaultValue: 'No BCF issues. Import a .bcf file or create issues from the model.' })}</div>
      ) : (
        <div className="bcf-topics">
          {topics.map((topic) => (
            <div
              key={topic.guid}
              className="bcf-topic"
              onClick={() => onSelectTopic?.(topic)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelectTopic?.(topic); }}
            >
              <div className="topic-header">
                <span
                  className="topic-status"
                  style={{ color: STATUS_COLORS[topic.topic_status] }}
                >
                  {topic.topic_status}
                </span>
                {topic.priority && (
                  <span className="topic-priority">{PRIORITY_LABELS[topic.priority]}</span>
                )}
              </div>
              <div className="topic-title">{topic.title}</div>
              {topic.assigned_to && (
                <div className="topic-assigned">{topic.assigned_to}</div>
              )}
              <div className="topic-date">{topic.creation_date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
