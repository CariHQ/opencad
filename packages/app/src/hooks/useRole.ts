import { useMemo } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { ROLE_CONFIGS, DEFAULT_ROLE, type RoleId, type RoleConfig } from '../config/roles';

export interface UseRoleResult {
  role: RoleId;
  config: RoleConfig;
  isViewOnly: boolean;
  can: (action: string) => boolean;
}

/**
 * Returns the current user's role and a can(action) predicate.
 *
 * Action namespaces:
 *   tool:<toolId>    — e.g. can('tool:wall')
 *   panel:<panelId>  — e.g. can('panel:compliance')
 *   layer:<layerId>  — e.g. can('layer:structural')  (writable check)
 */
export function useRole(): UseRoleResult {
  const userRole = useDocumentStore((s) => s.userRole);
  const role: RoleId = userRole ?? DEFAULT_ROLE;
  const config = ROLE_CONFIGS[role];

  const can = useMemo(() => {
    return (action: string): boolean => {
      const [ns, id] = action.split(':');
      if (!ns || !id) return false;

      switch (ns) {
        case 'tool':
          return config.tools.includes(id);
        case 'panel':
          return config.panels.includes(id);
        case 'layer': {
          if (config.writableLayers === 'all') return true;
          return (config.writableLayers as string[]).includes(id);
        }
        default:
          return false;
      }
    };
  }, [config]);

  return {
    role,
    config,
    isViewOnly: config.viewportMode === 'view-only',
    can,
  };
}
