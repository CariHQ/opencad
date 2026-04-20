/**
 * Favorites — T-MOD-026 (#319).
 *
 * A Favorite is a named snapshot of a tool's parameters the user can
 * apply in one click. Scoped per-tool. Two storage tiers: per-project
 * (lives on the doc, syncs via CRDT) and per-user (localStorage).
 */

export interface Favorite {
  id: string;
  tool: string;                   // 'wall' | 'door' | ...
  name: string;
  params: Record<string, unknown>;
  scope: 'user' | 'project';
  createdAt: number;
}

/** Storage key for user-level favorites in localStorage. */
export const USER_FAVORITES_KEY = 'opencad-favorites-user';

/** Create a new favorite record (does not persist). */
export function createFavorite(
  tool: string, name: string, params: Record<string, unknown>,
  scope: 'user' | 'project' = 'user',
): Favorite {
  const id = `fav-${tool}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return { id, tool, name, params, scope, createdAt: Date.now() };
}

/** Merge a list of favorites, deduping by id (project favorites take
 *  precedence over same-id user favorites). */
export function mergeFavorites(
  userFavs: Favorite[], projectFavs: Favorite[],
): Favorite[] {
  const byId = new Map<string, Favorite>();
  for (const f of userFavs) byId.set(f.id, f);
  for (const f of projectFavs) byId.set(f.id, f);
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Filter favorites to a specific tool. */
export function favoritesForTool(favs: Favorite[], tool: string): Favorite[] {
  return favs.filter((f) => f.tool === tool);
}

/** Apply a favorite → returns { tool, params } for the caller to push
 *  into the store's active tool + toolParams. */
export function applyFavorite(fav: Favorite): { tool: string; params: Record<string, unknown> } {
  return { tool: fav.tool, params: fav.params };
}

/** Seed user favorites: 4 starter walls, 2 doors, 2 windows. */
export function seedStarterFavorites(): Favorite[] {
  const now = Date.now();
  const mk = (id: string, tool: string, name: string, params: Record<string, unknown>): Favorite =>
    ({ id, tool, name, params, scope: 'user', createdAt: now });
  return [
    mk('starter-wall-ext-300',  'wall', 'Exterior 300 mm Concrete', { wallType: 'exterior', thickness: 300, material: 'Concrete' }),
    mk('starter-wall-int-150',  'wall', 'Interior 150 mm Plasterboard', { wallType: 'interior', thickness: 150, material: 'Plasterboard' }),
    mk('starter-wall-part-100', 'wall', 'Partition 100 mm', { wallType: 'partition', thickness: 100 }),
    mk('starter-wall-curt-60',  'wall', 'Curtain 60 mm Glass', { wallType: 'curtain', thickness: 60, material: 'Clear Glass' }),
    mk('starter-door-900',      'door', 'Single 900×2100 Oak', { width: 900, height: 2100, material: 'Oak' }),
    mk('starter-door-1800',     'door', 'Double 1800×2100 Aluminium', { width: 1800, height: 2100, material: 'Aluminium' }),
    mk('starter-window-1200',   'window', 'Casement 1200×1200', { width: 1200, height: 1200, operation: 'casement' }),
    mk('starter-window-2400',   'window', 'Fixed 2400×600', { width: 2400, height: 600, operation: 'fixed' }),
  ];
}
