/**
 * T-MOD-003 CoordBox component tests (GitHub issue #296).
 *
 * Cases:
 *   T-MOD-003-006 — renders Length + Angle inputs for wall tool
 *   T-MOD-003-007 — typing 4500 + Enter fires onCommit with length 4500
 *   T-MOD-003-008 — TAB rotates focus between declared fields
 *   T-MOD-003-009 — Esc fires onCancel
 *   T-MOD-003-010 — (n/a: rendered only when parent decides to mount; tested via Viewport)
 *   T-MOD-003-011 — Shift variant ({Distance}) — deferred to v2; covered by field set parameter
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoordBox } from './CoordBox';

function setup(overrides: Partial<React.ComponentProps<typeof CoordBox>> = {}) {
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  const defaults: React.ComponentProps<typeof CoordBox> = {
    x: 0, y: 0,
    preview: { length: 1000, angle: 0 },
    fields: ['length', 'angle'],
    onCommit,
    onCancel,
  };
  const utils = render(<CoordBox {...defaults} {...overrides} />);
  return { ...utils, onCommit, onCancel };
}

describe('T-MOD-003: CoordBox', () => {
  it('T-MOD-003-006: renders Length and Angle inputs for wall tool', () => {
    setup();
    expect(screen.getByLabelText('length')).toBeInTheDocument();
    expect(screen.getByLabelText('angle')).toBeInTheDocument();
  });

  it('T-MOD-003-007: typing 4500 + Enter fires onCommit({length:4500})', () => {
    const { onCommit } = setup();
    const lengthInput = screen.getByLabelText('length') as HTMLInputElement;
    fireEvent.change(lengthInput, { target: { value: '4500' } });
    fireEvent.keyDown(lengthInput, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ length: 4500 });
  });

  it('T-MOD-003-008: TAB rotates focus between declared fields', () => {
    setup();
    const length = screen.getByLabelText('length') as HTMLInputElement;
    const angle  = screen.getByLabelText('angle')  as HTMLInputElement;
    fireEvent.keyDown(length, { key: 'Tab' });
    expect(document.activeElement).toBe(angle);
    fireEvent.keyDown(angle, { key: 'Tab' });
    expect(document.activeElement).toBe(length);
  });

  it('T-MOD-003-009: Esc fires onCancel and does not commit', () => {
    const { onCommit, onCancel } = setup();
    const length = screen.getByLabelText('length') as HTMLInputElement;
    fireEvent.change(length, { target: { value: '4500' } });
    fireEvent.keyDown(length, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('T-MOD-003-007b: parses m/ft/in units before committing', () => {
    const { onCommit } = setup();
    const length = screen.getByLabelText('length') as HTMLInputElement;
    fireEvent.change(length, { target: { value: '4.5m' } });
    fireEvent.keyDown(length, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith({ length: 4500 });
  });

  it('commits both length and angle when both are typed', () => {
    const { onCommit } = setup();
    fireEvent.change(screen.getByLabelText('length'), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('angle'),  { target: { value: '45' } });
    fireEvent.keyDown(screen.getByLabelText('angle'), { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith({ length: 3000, angle: 45 });
  });

  it('renders rectangle fields when fields=[width,height]', () => {
    setup({ fields: ['width', 'height'], preview: { width: 1200, height: 800 } });
    expect(screen.getByLabelText('width')).toBeInTheDocument();
    expect(screen.getByLabelText('height')).toBeInTheDocument();
  });

  it('empty input on all fields + Enter cancels rather than committing null values', () => {
    const { onCommit, onCancel } = setup();
    fireEvent.keyDown(screen.getByLabelText('length'), { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
