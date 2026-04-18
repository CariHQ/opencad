import React, { useState, useRef, useEffect } from 'react';
import { MessageCirclePlus, X, Send, CheckCircle, ExternalLink, ChevronDown } from 'lucide-react';
import { feedbackApi, type FeedbackCategory, type FeedbackItem } from '../lib/serverApi';

type WidgetState = 'closed' | 'form' | 'submitted';

interface FeedbackWidgetProps {
  /** When provided the widget runs in controlled mode — the caller manages the trigger */
  open?: boolean;
  onClose?: () => void;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: '🐛 Bug report',
  feature: '✨ Feature request',
  question: '❓ Question',
};

const FEASIBILITY_BADGES: Record<string, { label: string; className: string }> = {
  in_scope: { label: 'In PRD scope', className: 'feedback-badge--green' },
  unclear: { label: 'Under review', className: 'feedback-badge--yellow' },
  out_of_scope: { label: 'Out of scope', className: 'feedback-badge--red' },
};

export function FeedbackWidget({ open: externalOpen, onClose: externalOnClose }: FeedbackWidgetProps = {}) {
  const controlled = externalOpen !== undefined;
  const [state, setState] = useState<WidgetState>('closed');
  const [category, setCategory] = useState<FeedbackCategory>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FeedbackItem | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // When controlled externally, sync open→form on first open
  useEffect(() => {
    if (!controlled) return;
    if (externalOpen && state === 'closed') {
      setTitle('');
      setDescription('');
      setError(null);
      setResult(null);
      setState('form');
    }
    if (!externalOpen) setState('closed');
  }, [controlled, externalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    setState('closed');
    externalOnClose?.();
  };

  // Close on Escape key
  useEffect(() => {
    if (state === 'closed') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (state === 'closed') return;
    const handler = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = () => {
    setTitle('');
    setDescription('');
    setError(null);
    setResult(null);
    setState('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const item = await feedbackApi.submit(category, title.trim(), description.trim());
      setResult(item);
      setState('submitted');
    } catch {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger — only rendered in uncontrolled mode */}
      {!controlled && (
        <button
          className="feedback-trigger"
          onClick={handleOpen}
          title="Send feedback"
          aria-label="Send feedback"
        >
          <MessageCirclePlus size={18} />
        </button>
      )}

      {/* Panel */}
      {state !== 'closed' && (
        <div className="feedback-overlay" role="dialog" aria-modal="true" aria-label="Feedback">
          <div ref={dialogRef} className="feedback-panel">
            {/* Header */}
            <div className="feedback-panel__header">
              <span className="feedback-panel__title">
                {state === 'submitted' ? 'Thanks for your feedback!' : 'Send feedback'}
              </span>
              <button className="feedback-panel__close" onClick={close}>
                <X size={16} />
              </button>
            </div>

            {/* Form state */}
            {state === 'form' && (
              <form className="feedback-form" onSubmit={(e) => void handleSubmit(e)}>
                {/* Category selector */}
                <div className="feedback-field">
                  <label className="feedback-label">Type</label>
                  <div className="feedback-select-wrapper">
                    <select
                      className="feedback-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                    >
                      {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((k) => (
                        <option key={k} value={k}>
                          {CATEGORY_LABELS[k]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="feedback-select-chevron" />
                  </div>
                </div>

                {/* Title */}
                <div className="feedback-field">
                  <label className="feedback-label" htmlFor="feedback-title">Title</label>
                  <input
                    id="feedback-title"
                    className="feedback-input"
                    type="text"
                    placeholder="Short summary"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>

                {/* Description */}
                <div className="feedback-field">
                  <label className="feedback-label" htmlFor="feedback-desc">Description</label>
                  <textarea
                    id="feedback-desc"
                    className="feedback-textarea"
                    placeholder="Describe the issue or idea in detail…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    required
                  />
                </div>

                {error && <p className="feedback-error">{error}</p>}

                <button
                  type="submit"
                  className="feedback-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    'Submitting…'
                  ) : (
                    <>
                      <Send size={14} />
                      Submit feedback
                    </>
                  )}
                </button>

                <p className="feedback-note">
                  Feedback is reviewed by the team and tracked as a GitHub issue.
                </p>
              </form>
            )}

            {/* Submitted state */}
            {state === 'submitted' && result && (
              <div className="feedback-success">
                <CheckCircle size={32} className="feedback-success__icon" />
                <p className="feedback-success__message">
                  Your feedback has been received and assessed against the product roadmap.
                </p>

                <div className="feedback-result">
                  <div className="feedback-result__row">
                    <span className="feedback-result__key">Feasibility</span>
                    <span className={`feedback-badge ${FEASIBILITY_BADGES[result.feasibility]?.className ?? ''}`}>
                      {FEASIBILITY_BADGES[result.feasibility]?.label ?? result.feasibility}
                    </span>
                  </div>
                  {result.prd_label && (
                    <div className="feedback-result__row">
                      <span className="feedback-result__key">PRD area</span>
                      <span className="feedback-badge feedback-badge--blue">{result.prd_label}</span>
                    </div>
                  )}
                  {result.github_issue_url && (
                    <div className="feedback-result__row">
                      <span className="feedback-result__key">Issue</span>
                      <a
                        href={result.github_issue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="feedback-issue-link"
                      >
                        #{result.github_issue_number}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                <button className="feedback-submit" onClick={close}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
