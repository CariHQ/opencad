import React, { useState } from 'react';

export type BCFStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type BCFPriority = 'critical' | 'high' | 'normal' | 'low';

export interface BCFTopic {
  guid: string;
  title: string;
  status: BCFStatus;
  priority: BCFPriority;
  creationDate: string;
  assignedTo?: string;
  description?: string;
  viewpointUrl?: string;
}

interface BCFPanelProps {
  initialTopics?: BCFTopic[];
  onImport?: (file: File) => void;
  onExport?: (topics: BCFTopic[]) => void;
  onSelectTopic?: (topic: BCFTopic) => void;
}

const STATUS_COLORS: Record<BCFStatus, string> = {
  open: '#e74c3c',
  'in-progress': '#f39c12',
  resolved: '#27ae60',
  closed: '#95a5a6',
};

const PRIORITY_LABELS: Record<BCFPriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export function BCFPanel({ initialTopics = [], onImport, onExport, onSelectTopic }: BCFPanelProps = {}) {
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
        <span className="panel-title">BCF Issues</span>
        <div className="bcf-actions">
          <button
            aria-label="Import BCF"
            className="btn-import-bcf"
            onClick={handleImportClick}
          >
            Import BCF
          </button>
          <button
            aria-label="Export BCF"
            className="btn-export-bcf"
            onClick={() => onExport?.(topics)}
          >
            Export BCF
          </button>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="bcf-empty">No BCF issues. Import a .bcf file or create issues from the model.</div>
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
                  style={{ color: STATUS_COLORS[topic.status] }}
                >
                  {topic.status}
                </span>
                <span className="topic-priority">{PRIORITY_LABELS[topic.priority]}</span>
              </div>
              <div className="topic-title">{topic.title}</div>
              {topic.assignedTo && (
                <div className="topic-assigned">{topic.assignedTo}</div>
              )}
              <div className="topic-date">{topic.creationDate}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
