import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import { checkCompliance, applyFix } from '@opencad/ai';
import type { Violation } from '@opencad/ai';

export function CompliancePanel(): React.ReactElement {
  const { document: doc, loadDocumentSchema } = useDocumentStore();
  const [violations, setViolations] = useState<Violation[] | null>(null);

  function runCheck(): void {
    if (!doc) {
      setViolations([]);
      return;
    }
    // DocumentSchema from @opencad/document is structurally identical to the
    // minimal DocumentSchema defined in @opencad/ai/src/types/document.ts.
    const report = checkCompliance(doc as Parameters<typeof checkCompliance>[0]);
    setViolations(report.violations);
  }

  function handleApplyFix(violation: Violation): void {
    if (!doc) return;
    const fixed = applyFix(
      doc as Parameters<typeof applyFix>[0],
      violation
    );
    // Cast back to DocumentSchema — structurally identical
    loadDocumentSchema(fixed as Parameters<typeof loadDocumentSchema>[0]);
    // Re-run check after fix
    const report = checkCompliance(fixed);
    setViolations(report.violations);
  }

  const errors = violations?.filter((v) => v.severity === 'error') ?? [];
  const warnings = violations?.filter((v) => v.severity === 'warning') ?? [];

  return (
    <div className="compliance-panel panel">
      <div className="panel-header">
        <span className="panel-title">Code Compliance</span>
      </div>

      <div className="panel-body">
        <button
          className="btn-primary compliance-run-btn"
          onClick={runCheck}
        >
          <ShieldCheck size={14} />
          Run Compliance Check
        </button>

        {violations === null ? (
          <div className="compliance-empty">
            <p>Run check to verify the model against IBC rules.</p>
          </div>
        ) : violations.length === 0 ? (
          <div className="compliance-empty">
            <p>No violations — model is compliant.</p>
          </div>
        ) : (
          <div className="compliance-results">
            <div className="compliance-summary">
              {violations.length} violation{violations.length !== 1 ? 's' : ''} found
            </div>

            {errors.length > 0 && (
              <div className="compliance-group">
                <h4 className="compliance-group-title">Errors ({errors.length})</h4>
                <ul className="compliance-list">
                  {errors.map((v) => (
                    <ViolationRow
                      key={`${v.ruleId}-${v.elementId}`}
                      violation={v}
                      onApplyFix={handleApplyFix}
                    />
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="compliance-group">
                <h4 className="compliance-group-title">Warnings ({warnings.length})</h4>
                <ul className="compliance-list">
                  {warnings.map((v) => (
                    <ViolationRow
                      key={`${v.ruleId}-${v.elementId}`}
                      violation={v}
                      onApplyFix={handleApplyFix}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ViolationRowProps {
  violation: Violation;
  onApplyFix: (v: Violation) => void;
}

function ViolationRow({ violation, onApplyFix }: ViolationRowProps): React.ReactElement {
  return (
    <li
      className={`compliance-item compliance-${violation.severity}`}
      data-violation-id={`${violation.ruleId}-${violation.elementId}`}
    >
      <div className="compliance-item-header">
        <span className={`compliance-badge badge-${violation.severity}`}>
          {violation.severity.toUpperCase()}
        </span>
        <span className="compliance-section">{violation.section}</span>
      </div>
      <p className="compliance-description">{violation.description}</p>
      <div className="compliance-item-footer">
        <span className="compliance-fix-hint">{violation.suggestedFix}</span>
        <button
          className="btn-secondary compliance-apply-fix-btn"
          onClick={() => onApplyFix(violation)}
        >
          Apply Fix
        </button>
      </div>
    </li>
  );
}
