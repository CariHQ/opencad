export * from './orchestrator';
export * from './design-generator';
export { FloorPlanGenerator } from './floorPlanGenerator';
export {
  validateFloorPlan,
  validateCirculation,
  validateRoomSizes,
  validateTotalArea,
} from './floorPlanValidation';
export * from './designCommands';

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

// IBC compliance engine (T-AI-020 through T-AI-024)
export { checkCompliance, applyFix } from './codeCompliance';
export { IBC_RULES } from './rules/ibc';
export type { ComplianceReport, Violation } from './codeCompliance';
export type { Rule } from './rules/ibc';

// BIM element validation (T-AI-005 through T-AI-007)
export { validateElement } from './validation';
export type { ValidationResult } from './validation';

// AI project generation with validation
export { generateProject } from './generate';
export type { GenerateProjectOptions, GenerateProjectResult, ElementValidationSummary } from './generate';
