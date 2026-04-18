import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRole } from './useRole';
import { useDocumentStore } from '../stores/documentStore';
import type { RoleId } from '../config/roles';

function setRole(role: RoleId | null) {
  useDocumentStore.setState({ userRole: role });
}

describe('useRole (T-ROLE-001)', () => {
  beforeEach(() => {
    // reset to null (defaults to architect)
    useDocumentStore.setState({ userRole: null });
  });

  it('defaults to architect when userRole is null', () => {
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe('architect');
  });

  it('returns correct role when set', () => {
    setRole('structural');
    const { result } = renderHook(() => useRole());
    expect(result.current.role).toBe('structural');
  });

  describe('can() — tool namespace', () => {
    it('architect can use wall tool', () => {
      setRole('architect');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('tool:wall')).toBe(true);
    });

    it('structural cannot use wall tool', () => {
      setRole('structural');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('tool:wall')).toBe(false);
    });

    it('owner cannot use any tool', () => {
      setRole('owner');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('tool:select')).toBe(false);
      expect(result.current.can('tool:wall')).toBe(false);
      expect(result.current.can('tool:ai')).toBe(false);
    });

    it('contractor can use select but not wall', () => {
      setRole('contractor');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('tool:select')).toBe(true);
      expect(result.current.can('tool:wall')).toBe(false);
    });

    it('returns false for unknown namespace', () => {
      setRole('architect');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('unknown:something')).toBe(false);
    });

    it('returns false for malformed action with no colon', () => {
      setRole('architect');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('wall')).toBe(false);
    });
  });

  describe('can() — panel namespace', () => {
    it('architect can see AI panel', () => {
      setRole('architect');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('panel:ai')).toBe(true);
    });

    it('contractor cannot see AI panel', () => {
      setRole('contractor');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('panel:ai')).toBe(false);
    });

    it('structural can see compliance panel', () => {
      setRole('structural');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('panel:compliance')).toBe(true);
    });

    it('owner can only see navigator panel', () => {
      setRole('owner');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('panel:navigator')).toBe(true);
      expect(result.current.can('panel:properties')).toBe(false);
      expect(result.current.can('panel:layers')).toBe(false);
    });
  });

  describe('can() — layer namespace', () => {
    it('architect can write to any layer', () => {
      setRole('architect');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('layer:structural')).toBe(true);
      expect(result.current.can('layer:custom-layer-xyz')).toBe(true);
    });

    it('structural can write to structural layer', () => {
      setRole('structural');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('layer:structural')).toBe(true);
    });

    it('structural cannot write to architectural layer', () => {
      setRole('structural');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('layer:architectural')).toBe(false);
    });

    it('owner cannot write to any layer', () => {
      setRole('owner');
      const { result } = renderHook(() => useRole());
      expect(result.current.can('layer:structural')).toBe(false);
    });
  });

  describe('isViewOnly', () => {
    it('architect is not view-only', () => {
      setRole('architect');
      const { result } = renderHook(() => useRole());
      expect(result.current.isViewOnly).toBe(false);
    });

    it('owner is view-only', () => {
      setRole('owner');
      const { result } = renderHook(() => useRole());
      expect(result.current.isViewOnly).toBe(true);
    });

    it('pm is view-only', () => {
      setRole('pm');
      const { result } = renderHook(() => useRole());
      expect(result.current.isViewOnly).toBe(true);
    });

    it('admin is view-only', () => {
      setRole('admin');
      const { result } = renderHook(() => useRole());
      expect(result.current.isViewOnly).toBe(true);
    });

    it('structural is interactive', () => {
      setRole('structural');
      const { result } = renderHook(() => useRole());
      expect(result.current.isViewOnly).toBe(false);
    });
  });
});
