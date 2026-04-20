/**
 * View Map + view templates — T-VIZ-039 (#332).
 *
 * Organises every drawing / rendering into a folder tree and lets users
 * apply saved "view templates" that bundle scale, story filter, layer
 * combination, graphic override, annotation layer.
 */

export type ViewCategory =
  | 'plan' | 'section' | 'elevation' | 'detail'
  | 'schedule' | '3d' | 'rendering' | 'worksheet';

export interface ViewEntry {
  id: string;
  name: string;
  category: ViewCategory;
  /** Folder path (e.g. "Plans / Ground Floor"). */
  folderPath: string;
  templateId?: string;
  settings: ViewSettings;
}

export interface ViewSettings {
  scale?: string;                 // "1:100"
  visibleStories?: 'all' | 'current' | 'current-and-below' | 'current-and-above';
  layerCombinationId?: string;
  graphicOverrideId?: string;
  annotationLayerId?: string;
}

export interface ViewTemplate {
  id: string;
  name: string;
  /** Which categories this template is applicable to. Empty = all. */
  applyTo?: ViewCategory[];
  settings: ViewSettings;
}

/** Seed set of templates every new project ships with. */
export const DEFAULT_TEMPLATES: ViewTemplate[] = [
  {
    id: 'tmpl-working-plan-1-100',
    name: 'Working Plan 1:100',
    applyTo: ['plan'],
    settings: { scale: '1:100', visibleStories: 'current' },
  },
  {
    id: 'tmpl-presentation-plan-1-50',
    name: 'Presentation Plan 1:50',
    applyTo: ['plan'],
    settings: { scale: '1:50', visibleStories: 'current' },
  },
  {
    id: 'tmpl-detail-1-10',
    name: 'Detail 1:10',
    applyTo: ['detail'],
    settings: { scale: '1:10' },
  },
  {
    id: 'tmpl-construction-section-1-100',
    name: 'Construction Section 1:100',
    applyTo: ['section'],
    settings: { scale: '1:100', visibleStories: 'all' },
  },
];

/**
 * Build a folder tree from a flat list of views. Folders are
 * derived from each view's folderPath ("Plans / Ground Floor").
 */
export interface FolderNode {
  path: string;
  name: string;
  views: ViewEntry[];
  children: FolderNode[];
}

export function buildViewMapTree(views: ViewEntry[]): FolderNode[] {
  const root: FolderNode[] = [];
  const byPath = new Map<string, FolderNode>();

  const ensureFolder = (path: string): FolderNode => {
    const existing = byPath.get(path);
    if (existing) return existing;
    const name = path.includes('/') ? path.split('/').pop()!.trim() : path;
    const parentPath = path.includes('/') ? path.split('/').slice(0, -1).join('/').trim() : '';
    const node: FolderNode = { path, name, views: [], children: [] };
    byPath.set(path, node);
    if (parentPath === '') root.push(node);
    else ensureFolder(parentPath).children.push(node);
    return node;
  };

  for (const v of views) {
    const path = v.folderPath || v.category;
    ensureFolder(path).views.push(v);
  }
  return root;
}

/** Apply a template's settings to a view (overwrites conflicting fields). */
export function applyTemplate(view: ViewEntry, template: ViewTemplate): ViewEntry {
  return {
    ...view,
    templateId: template.id,
    settings: { ...view.settings, ...template.settings },
  };
}

/** List templates applicable to a given view category. */
export function templatesForCategory(
  templates: ViewTemplate[], category: ViewCategory,
): ViewTemplate[] {
  return templates.filter((t) => !t.applyTo || t.applyTo.includes(category));
}
