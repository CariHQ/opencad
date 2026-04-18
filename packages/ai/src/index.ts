export * from './orchestrator';
export * from './design-generator';
export { FloorPlanGenerator } from './floorPlanGenerator';
export {
  validateFloorPlan,
  validateCirculation,
  validateRoomSizes,
  validateTotalArea,
} from './floorPlanValidation';
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
