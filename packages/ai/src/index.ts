export * from './orchestrator';
export * from './design-generator';
export { checkCompliance, applyFix } from './codeCompliance';
export type { ComplianceReport, Violation } from './codeCompliance';

import {
  createDesignGenerator,
  createCodeComplianceChecker,
  createBIMErrorDetector,
  createEnergyAnalyzer,
  createSmartPlacement,
} from './features';

export {
  createDesignGenerator,
  createCodeComplianceChecker,
  createBIMErrorDetector,
  createEnergyAnalyzer,
  createSmartPlacement,
};
