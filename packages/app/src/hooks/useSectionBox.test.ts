/**
 * T-3D-005: Section box hook tests
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSectionBox } from './useSectionBox';

describe('T-3D-005: useSectionBox', () => {
  it('starts disabled', () => {
    const { result } = renderHook(() => useSectionBox());
    expect(result.current.sectionBox.enabled).toBe(false);
  });

  it('starts with no linked level', () => {
    const { result } = renderHook(() => useSectionBox());
    expect(result.current.sectionBox.linkedLevelId).toBeNull();
  });

  it('enable sets enabled to true', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.enable());
    expect(result.current.sectionBox.enabled).toBe(true);
  });

  it('disable sets enabled to false', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.enable());
    act(() => result.current.disable());
    expect(result.current.sectionBox.enabled).toBe(false);
  });

  it('toggle flips enabled', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.toggle());
    expect(result.current.sectionBox.enabled).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.sectionBox.enabled).toBe(false);
  });

  it('setBounds updates specified axes', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.setBounds({ minX: -1000, maxX: 1000 }));
    expect(result.current.sectionBox.bounds.minX).toBe(-1000);
    expect(result.current.sectionBox.bounds.maxX).toBe(1000);
  });

  it('setBounds does not affect unspecified axes', () => {
    const { result } = renderHook(() => useSectionBox());
    const originalMinY = result.current.sectionBox.bounds.minY;
    act(() => result.current.setBounds({ minX: 0 }));
    expect(result.current.sectionBox.bounds.minY).toBe(originalMinY);
  });

  it('resetBounds restores defaults', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.setBounds({ minX: 999, maxX: 999 }));
    act(() => result.current.resetBounds());
    expect(result.current.sectionBox.bounds.minX).toBe(-50000);
    expect(result.current.sectionBox.bounds.maxX).toBe(50000);
  });

  it('resetBounds clears linked level', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.linkToLevel('level-1', 0, 3000));
    act(() => result.current.resetBounds());
    expect(result.current.sectionBox.linkedLevelId).toBeNull();
  });

  it('linkToLevel sets linkedLevelId and enables section box', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.linkToLevel('level-1', 0, 3000));
    expect(result.current.sectionBox.linkedLevelId).toBe('level-1');
    expect(result.current.sectionBox.enabled).toBe(true);
  });

  it('linkToLevel sets Z bounds from elevation and height', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.linkToLevel('level-2', 3000, 3200));
    expect(result.current.sectionBox.bounds.minZ).toBe(3000);
    expect(result.current.sectionBox.bounds.maxZ).toBe(6200);
  });

  it('unlinkFromLevel clears linkedLevelId', () => {
    const { result } = renderHook(() => useSectionBox());
    act(() => result.current.linkToLevel('level-1', 0, 3000));
    act(() => result.current.unlinkFromLevel());
    expect(result.current.sectionBox.linkedLevelId).toBeNull();
  });

  it('accepts initialBounds override', () => {
    const { result } = renderHook(() => useSectionBox({ minZ: 500, maxZ: 4000 }));
    expect(result.current.sectionBox.bounds.minZ).toBe(500);
    expect(result.current.sectionBox.bounds.maxZ).toBe(4000);
  });
});
