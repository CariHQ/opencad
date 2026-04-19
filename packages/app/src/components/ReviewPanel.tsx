/**
 * ReviewPanel — design review workflow panel.
 * T-REVIEW-001: Request Review → Approve / Request Changes flow.
 */

import React from 'react';
import { CheckCircle, GitPullRequest, XCircle } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';

type ReviewStatus = 'none' | 'pending' | 'approved' | 'changes_requested';

export function ReviewPanel(): React.ReactElement {
  const { reviewStatus, setReviewStatus } = useDocumentStore() as {
    reviewStatus: ReviewStatus;
    setReviewStatus: (status: ReviewStatus) => void;
  };

  return (
    <div className="review-panel">
      <div className="panel-header">
        <span className="panel-title">Design Review</span>
      </div>

      <div className="review-body">
        {reviewStatus === 'none' && (
          <div className="review-section">
            <p className="review-hint">Submit this design for team review before finalizing.</p>
            <button
              className="btn-review btn-request-review"
              onClick={() => setReviewStatus('pending')}
            >
              <GitPullRequest size={14} />
              Request Review
            </button>
          </div>
        )}

        {reviewStatus === 'pending' && (
          <div className="review-section">
            <div className="review-status-indicator">
              <span className="review-status-dot review-status-dot--pending" />
              <span>Review Pending</span>
            </div>
            <p className="review-hint">Waiting for reviewers to approve or request changes.</p>
            <div className="review-reviewer-list">
              <p className="review-reviewers-label">Reviewers</p>
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
                Approve
              </button>
              <button
                className="btn-review btn-request-changes"
                onClick={() => setReviewStatus('changes_requested')}
              >
                <XCircle size={14} />
                Request Changes
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
              Approved
            </span>
            <p className="review-hint" style={{ marginTop: 8 }}>This design has been approved by reviewers.</p>
            <button
              className="btn-review btn-new-review"
              onClick={() => setReviewStatus('none')}
            >
              New Review
            </button>
          </div>
        )}

        {reviewStatus === 'changes_requested' && (
          <div className="review-section">
            <div className="review-status-indicator">
              <span className="review-status-dot review-status-dot--changes" />
              <span>Changes Requested</span>
            </div>
            <p className="review-hint">Reviewers have requested changes before approving.</p>
            <label htmlFor="review-comment" className="review-comment-label">
              Comment
            </label>
            <textarea
              id="review-comment"
              aria-label="comment"
              className="review-comment-textarea"
              placeholder="Describe the changes needed…"
              rows={4}
            />
            <button
              className="btn-review btn-request-review"
              style={{ marginTop: 8 }}
              onClick={() => setReviewStatus('none')}
            >
              Reset Review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
