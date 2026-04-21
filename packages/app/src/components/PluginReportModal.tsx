/**
 * Report-a-plugin modal.
 *
 * Sends a structured report (reason + optional details) to
 * /api/v1/marketplace/plugins/:id/report. Admins triage via
 * /api/v1/marketplace/admin/queue and can revoke via the kill switch.
 *
 * Intentionally lightweight. We're not trying to be a full abuse flow,
 * just making it possible for users to flag a plugin that's broken,
 * spammy, or hostile.
 */
import React, { useState } from 'react';
import { reportPlugin, type PluginReportBody } from '../lib/marketplaceApi';

interface PluginReportModalProps {
  pluginId: string;
  pluginName: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const REASONS: { value: PluginReportBody['reason']; label: string }[] = [
  { value: 'malware',  label: 'Malware or security issue' },
  { value: 'broken',   label: 'Broken or crashes' },
  { value: 'spam',     label: 'Spam or unwanted behaviour' },
  { value: 'policy',   label: 'Policy / content violation' },
  { value: 'other',    label: 'Something else' },
];

export function PluginReportModal({
  pluginId,
  pluginName,
  onClose,
  onSubmitted,
}: PluginReportModalProps): React.ReactElement {
  const [reason, setReason] = useState<PluginReportBody['reason']>('broken');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      await reportPlugin(pluginId, {
        reason,
        details: details.trim() || undefined,
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="plugin-consent-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plugin-report-title"
      onClick={onClose}
    >
      <div className="plugin-consent-modal" onClick={(e) => e.stopPropagation()}>
        <div className="plugin-consent-header">
          <h3 id="plugin-report-title" className="plugin-consent-title">
            Report {pluginName}
          </h3>
          <div className="plugin-consent-meta">
            Send this plugin to moderators for review.
          </div>
        </div>

        <label className="plugin-report-field">
          <span className="plugin-report-label">Reason</span>
          <select
            className="plugin-report-select"
            value={reason}
            onChange={(e) => setReason(e.target.value as PluginReportBody['reason'])}
            disabled={submitting}
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>

        <label className="plugin-report-field">
          <span className="plugin-report-label">Details (optional)</span>
          <textarea
            className="plugin-report-textarea"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What happened? Include repro steps if possible."
            rows={4}
            maxLength={2000}
            disabled={submitting}
          />
        </label>

        {error && <div className="plugin-report-error">{error}</div>}

        <div className="plugin-consent-actions">
          <button
            type="button"
            className="plugin-consent-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="plugin-consent-accept"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  );
}
