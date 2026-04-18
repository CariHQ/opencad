/**
 * CompliancePanel component tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompliancePanel } from './CompliancePanel';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');
vi.mock('@opencad/ai', () => ({
  checkCompliance: vi.fn().mockReturnValue({
    violations: [
      {
        ruleId: 'IBC-1208.3',
        section: 'IBC Section 1208.3',
        elementId: 'bedroom-1',
        description: 'Bedroom area 6.00 m² is below minimum 7.43 m².',
        severity: 'error',
        suggestedFix: 'Expand the floor area to at least 7.43 m².',
      },
    ],
    compliant: false,
    checkedRules: ['IBC-1208.2', 'IBC-1208.3', 'IBC-1005.1', 'IBC-1010.1.1'],
  }),
  applyFix: vi.fn().mockImplementation((schema: unknown) => schema),
}));

function makeStore(overrides = {}) {
  return {
    document: {
      id: 'proj-1',
      name: 'Test',
      content: { elements: {}, spaces: {} },
      organization: { layers: {}, levels: {} },
      presentation: { views: {}, annotations: {} },
      library: { materials: {} },
      version: { clock: {} },
      metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u', schemaVersion: '1.0.0' },
    },
    selectedIds: [],
    setSelectedIds: vi.fn(),
    loadDocumentSchema: vi.fn(),
    ...overrides,
  };
}

describe('CompliancePanel', () => {
  beforeEach(() => {
    vi.mocked(useDocumentStore).mockReturnValue(makeStore() as never);
  });

  it('renders panel title', () => {
    render(<CompliancePanel />);
    expect(screen.getByText('Code Compliance')).toBeInTheDocument();
  });

  it('renders Run Compliance Check button', () => {
    render(<CompliancePanel />);
    expect(screen.getByRole('button', { name: /run compliance check/i })).toBeInTheDocument();
  });

  it('shows empty state before running check', () => {
    render(<CompliancePanel />);
    expect(screen.getByText(/run check to verify/i)).toBeInTheDocument();
  });

  it('shows violation results after running check', () => {
    render(<CompliancePanel />);
    fireEvent.click(screen.getByRole('button', { name: /run compliance check/i }));
    expect(screen.getByText(/1 violation/i)).toBeInTheDocument();
  });

  it('displays section citation in results', () => {
    render(<CompliancePanel />);
    fireEvent.click(screen.getByRole('button', { name: /run compliance check/i }));
    expect(screen.getByText('IBC Section 1208.3')).toBeInTheDocument();
  });

  it('shows Apply Fix button per violation', () => {
    render(<CompliancePanel />);
    fireEvent.click(screen.getByRole('button', { name: /run compliance check/i }));
    expect(screen.getAllByRole('button', { name: /apply fix/i }).length).toBeGreaterThan(0);
  });

  it('shows "No violations — model is compliant." when violations are empty', async () => {
    const mod = await import('@opencad/ai');
    vi.mocked(mod.checkCompliance).mockReturnValueOnce({
      violations: [],
      compliant: true,
      checkedRules: [],
    });
    render(<CompliancePanel />);
    fireEvent.click(screen.getByRole('button', { name: /run compliance check/i }));
    expect(screen.getByText(/no violations.*compliant/i)).toBeInTheDocument();
  });
});
