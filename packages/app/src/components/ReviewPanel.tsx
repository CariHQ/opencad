/**
 * ReviewPanel — design review workflow panel.
 * T-REVIEW-001: Request Review → Approve / Request Changes flow.
 */

import React from 'react';
import { CheckCircle, GitPullRequest, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';

type ReviewStatus = 'none' | 'pending' | 'approved' | 'changes_requested';

export function ReviewPanel(): React.ReactElement {
  const { t } = useTranslation('panels');
  const { reviewStatus, setReviewStatus } = useDocumentStore() as {
    reviewStatus: ReviewStatus;
    setReviewStatus: (status: ReviewStatus) => void;
  };

  return (
    <div className="review-panel">
      <div className="panel-header">
        <span className="panel-title">{t('review.title')}</span>
      </div>

      <div className="review-body">
        {reviewStatus === 'none' && (
          <div className="review-section">
            <p className="review-hint">{t('review.submitHint', { defaultValue: 'Submit this design for team review before finalizing.' })}</p>
            <button
              className="btn-review btn-request-review"
              onClick={() => setReviewStatus('pending')}
            >
              <GitPullRequest size={14} />
              {t('review.request')}
            </button>
          </div>
        )}

        {reviewStatus === 'pending' && (
          <div className="review-section">
            <div className="review-status-indicator">
              <span className="review-status-dot review-status-dot--pending" />
              <span>{t('review.status.pending')}</span>
            </div>
            <p className="review-hint">{t('review.pendingHint', { defaultValue: 'Waiting for reviewers to approve or request changes.' })}</p>
            <div className="review-reviewer-list">
              <p className="review-reviewers-label">{t('review.reviewersLabel', { defaultValue: 'Reviewers' })}</p>
              <ul>
                <li>Reviewer 1</li>
                <li>Reviewer 2</li>
              </ul>
            </div>
            <div className="review-actions">
              <button
                className="btn-review btn-approve"
                onClick={() => setReviewStatus('approved')}
              >
                <CheckCircle size={14} />
                {t('review.approve')}
              </button>
              <button
                className="btn-review btn-request-changes"
                onClick={() => setReviewStatus('changes_requested')}
              >
                <XCircle size={14} />
                {t('review.requestChanges')}
              </button>
            </div>
          </div>
        )}

        {reviewStatus === 'approved' && (
          <div className="review-section">
            <span
              data-testid="review-approved-badge"
              className="review-approved-badge"
              style={{ color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={16} />
              {t('review.status.approved')}
            </span>
            <p className="review-hint" style={{ marginTop: 8 }}>{t('review.approvedDetail', { defaultValue: 'This design has been approved by reviewers.' })}</p>
            <button
              className="btn-review btn-new-review"
              onClick={() => setReviewStatus('none')}
            >
              {t('review.newReview', { defaultValue: 'New Review' })}
            </button>
          </div>
        )}

        {reviewStatus === 'changes_requested' && (
          <div className="review-section">
            <div className="review-status-indicator">
              <span className="review-status-dot review-status-dot--changes" />
              <span>{t('review.status.changesRequested')}</span>
            </div>
            <p className="review-hint">{t('review.changesHint', { defaultValue: 'Reviewers have requested changes before approving.' })}</p>
            <label htmlFor="review-comment" className="review-comment-label">
              {t('review.comment', { defaultValue: 'Comment' })}
            </label>
            <textarea
              id="review-comment"
              aria-label={t('review.commentAria', { defaultValue: 'comment' })}
              className="review-comment-textarea"
              placeholder={t('review.commentPlaceholder', { defaultValue: 'Describe the changes needed…' })}
              rows={4}
            />
            <button
              className="btn-review btn-request-review"
              style={{ marginTop: 8 }}
              onClick={() => setReviewStatus('none')}
            >
              {t('review.reset', { defaultValue: 'Reset Review' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
