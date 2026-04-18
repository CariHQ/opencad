/**
 * Building Code Compliance Engine
 * DocumentSchema-based, purely synchronous, offline-capable.
 *
 * T-AI-020: No false negatives — all violations identified
 * T-AI-021: No false positives on compliant model
 * T-AI-022: Correct code section cited per violation
 * T-AI-023: applyFix resolves the violation
 * T-AI-024: Zero async/network calls — works offline
 */

import type { DocumentSchema, ElementSchema } from './types/document';
import { IBC_RULES } from './rules/ibc';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface Violation {
  ruleId: string;
  section: string;
  elementId: string;
  description: string;
  severity: 'error' | 'warning';
  suggestedFix: string;
}

export interface ComplianceReport {
  violations: Violation[];
  compliant: boolean;
  checkedRules: string[];
}

// ---------------------------------------------------------------------------
// checkCompliance — purely synchronous
// ---------------------------------------------------------------------------

export function checkCompliance(schema: DocumentSchema): ComplianceReport {
  const violations: Violation[] = [];
  const checkedRules: string[] = [];

  for (const rule of IBC_RULES) {
    checkedRules.push(rule.id);
    const found = rule.check(schema);
    violations.push(...found);
  }

  return {
    violations,
    compliant: violations.length === 0,
    checkedRules,
  };
}

// ---------------------------------------------------------------------------
// applyFix — returns a new (immutable) DocumentSchema with the element corrected
// ---------------------------------------------------------------------------

export function applyFix(schema: DocumentSchema, violation: Violation): DocumentSchema {
  const rule = IBC_RULES.find((r) => r.id === violation.ruleId);
  if (!rule) {
    return schema;
  }
  return rule.fix(schema, violation);
}

// ---------------------------------------------------------------------------
// Helper utilities (used by rule implementations)
// ---------------------------------------------------------------------------

/** Read a numeric property value from an ElementSchema, or return undefined. */
export function getNumProp(element: ElementSchema, key: string): number | undefined {
  const pv = element.properties[key];
  if (pv && pv.type === 'number') {
    return pv.value as number;
  }
  return undefined;
}

/** Read a string property value from an ElementSchema, or return undefined. */
export function getStrProp(element: ElementSchema, key: string): string | undefined {
  const pv = element.properties[key];
  if (pv && pv.type === 'string') {
    return pv.value as string;
  }
  return undefined;
}

/** Read a boolean property value from an ElementSchema, or return false. */
export function getBoolProp(element: ElementSchema, key: string): boolean {
  const pv = element.properties[key];
  if (pv && pv.type === 'boolean') {
    return pv.value as boolean;
  }
  return false;
}

/** Produce an immutable update of an element's numeric property. */
export function setNumProp(
  schema: DocumentSchema,
  elementId: string,
  key: string,
  value: number
): DocumentSchema {
  const element = schema.content.elements[elementId];
  if (!element) return schema;

  const updatedElement: ElementSchema = {
    ...element,
    properties: {
      ...element.properties,
      [key]: { type: 'number', value },
    },
  };

  return {
    ...schema,
    content: {
      ...schema.content,
      elements: {
        ...schema.content.elements,
        [elementId]: updatedElement,
      },
    },
  };
}
