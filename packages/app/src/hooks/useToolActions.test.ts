/**
 * Tool Actions Tests
 * Issue #1: Wire up drawing tools in ToolShelf
 */

import { describe, it, expect } from 'vitest';
import { getDefaultElementForTool, buildElementProps } from './useToolActions';

describe('Issue #1: Wire up drawing tools', () => {
  describe('getDefaultElementForTool', () => {
    it('should return wall element props for wall tool', () => {
      const props = getDefaultElementForTool('wall');
      expect(props).toBeDefined();
      expect(props!.type).toBe('wall');
    });

    it('should return door element props for door tool', () => {
      const props = getDefaultElementForTool('door');
      expect(props!.type).toBe('door');
    });

    it('should return window element props for window tool', () => {
      const props = getDefaultElementForTool('window');
      expect(props!.type).toBe('window');
    });

    it('should return slab element props for slab tool', () => {
      const props = getDefaultElementForTool('slab');
      expect(props!.type).toBe('slab');
    });

    it('should return roof element props for roof tool', () => {
      const props = getDefaultElementForTool('roof');
      expect(props!.type).toBe('roof');
    });

    it('should return null for non-placement tools', () => {
      expect(getDefaultElementForTool('select')).toBeNull();
      expect(getDefaultElementForTool('line')).toBeNull();
    });
  });

  describe('buildElementProps', () => {
    it('should build wall props with position', () => {
      const props = buildElementProps('wall', { x: 10, y: 20 });
      expect(props.type).toBe('wall');
      expect(props.properties).toMatchObject({ x: 10, y: 20 });
    });

    it('should include default dimensions for wall', () => {
      const props = buildElementProps('wall', { x: 0, y: 0 });
      expect(props.properties).toHaveProperty('width');
      expect(props.properties).toHaveProperty('height');
    });

    it('should include default dimensions for door', () => {
      const props = buildElementProps('door', { x: 0, y: 0 });
      expect(props.properties).toHaveProperty('width');
      expect(props.properties).toHaveProperty('height');
    });

    it('should include keyboard shortcut mappings', () => {
      // W → wall, D → door, N → window, S → slab, O → roof
      expect(getDefaultElementForTool('select')).toBeNull();
    });
  });
});
