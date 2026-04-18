import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DocumentModel, type DocumentSchema, type PropertyValue } from '@opencad/document';
import {
  saveDocument as offlineSaveDocument,
  loadDocument as offlineLoadDocument,
  listPendingSync,
  markSynced,
} from '../lib/offlineStore';
import { type RoleId } from '../config/roles';

interface HistoryEntry {
  document: DocumentSchema;
  timestamp: number;
  description: string;
}

interface DocumentState {
  document: DocumentSchema | null;
  model: DocumentModel | null;
  selectedIds: string[];
  activeTool: string;
  isOnline: boolean;
  isSaving: boolean;
  lastSaved: number | null;

  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  selectedLevelId: string | null;

  userRole: RoleId | null;

  toolParams: Record<string, Record<string, unknown>>;

  initProject: (projectId: string, userId: string) => void;
  loadProject: (projectId: string, userId: string) => void;
  setSelectedIds: (ids: string[]) => void;
  setActiveTool: (tool: string) => void;
  setOnlineStatus: (online: boolean) => void;

  addLayer: (params: { name: string; color: string }) => string;
  updateLayer: (layerId: string, updates: Record<string, unknown>) => void;
  deleteLayer: (layerId: string) => void;

  addElement: (params: {
    type: string;
    layerId: string;
    properties?: Record<string, unknown>;
  }) => string;
  updateElement: (elementId: string, updates: Record<string, unknown>) => void;
  deleteElement: (elementId: string) => void;

  setToolParam: (tool: string, key: string, value: unknown) => void;

  setUserRole: (role: RoleId | null) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  createVersion: (message?: string) => void;
  restoreVersion: (versionNumber: number) => void;
  getVersionList: () => Array<{ version: number; timestamp: number; message?: string }>;

  loadDocumentSchema: (schema: DocumentSchema) => void;

  setActiveLevel: (levelId: string) => void;
  addLevel: (params: { name: string; elevation: number; height?: number }) => string;
  updateLevel: (levelId: string, updates: { name?: string; elevation?: number; height?: number }) => void;
  deleteLevel: (levelId: string) => void;
  renameLevel: (levelId: string, name: string) => void;
  renameProject: (name: string) => void;
}

const MAX_HISTORY = 50;

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      document: null,
      model: null,
      selectedIds: [],
      activeTool: 'select',
      isOnline: true,
      isSaving: false,
      lastSaved: null,

      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,

      selectedLevelId: null,

      userRole: null,

      toolParams: {
        wall: { height: 3000, thickness: 200, material: 'Concrete', wallType: 'interior' },
        door: { height: 2100, width: 900, swing: 90 },
        window: { height: 1200, width: 1200, sillHeight: 900 },
      },

      initProject: (projectId, userId) => {
        let model: DocumentModel;
        try {
          const saved = localStorage.getItem('opencad-document');
          if (saved) {
            const docData = JSON.parse(saved);
            // Guard against pre-refactor schema (no content/organization groups)
            if (docData?.content && docData?.organization) {
              model = new DocumentModel(projectId, userId);
              model.loadDocument(docData);
            } else {
              localStorage.removeItem('opencad-document');
              model = new DocumentModel(projectId, userId);
            }
          } else {
            model = new DocumentModel(projectId, userId);
          }
        } catch {
          model = new DocumentModel(projectId, userId);
        }
        const document = model.documentData;

        set({
          document,
          model,
          lastSaved: Date.now(),
          history: [],
          historyIndex: -1,
          canUndo: false,
          canRedo: false,
        });
      },

      loadProject: (projectId, userId) => {
        const model = new DocumentModel(projectId, userId);
        const document = model.documentData;

        set({
          document,
          model,
          lastSaved: Date.now(),
          history: [],
          historyIndex: -1,
          canUndo: false,
          canRedo: false,
        });
      },

      setSelectedIds: (ids) => set({ selectedIds: ids }),

      setActiveTool: (tool) => set({ activeTool: tool }),

      setOnlineStatus: (online) => {
        const { model, isOnline } = get();
        if (model) {
          model.setOnlineStatus(online);
        }
        set({ isOnline: online });

        // When transitioning from offline → online, flush any pending offline edits.
        if (online && !isOnline) {
          void listPendingSync().then((pendingIds) => {
            for (const pid of pendingIds) {
              void offlineLoadDocument(pid).then((data) => {
                if (!data) return;
                // Re-save locally to mark synced (no server API on this branch)
                void markSynced(pid).catch(() => {});
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      },

      addLayer: (params) => {
        const { model } = get();
        if (!model) throw new Error('No document loaded');

        const layerId = model.addLayer(params);
        set({
          document: { ...model.documentData },
          lastSaved: Date.now(),
        });
        return layerId;
      },

      updateLayer: (layerId, updates) => {
        const { model } = get();
        if (!model) return;

        model.updateLayer(layerId, updates as Record<string, unknown>);
        set({ document: { ...model.documentData } });
      },

      deleteLayer: (layerId) => {
        const { model } = get();
        if (!model) return;

        model.deleteLayer(layerId);
        set({ document: { ...model.documentData } });
      },

      addElement: (params) => {
        const { model } = get();
        if (!model) throw new Error('No document loaded');

        const elementId = model.addElement({
          type: params.type as 'wall' | 'door' | 'window' | 'slab',
          layerId: params.layerId,
          properties: params.properties as Record<string, PropertyValue>,
        });

        const newDoc = { ...model.documentData };
        const newDocJson = JSON.stringify(newDoc);
        set({
          document: newDoc,
          lastSaved: Date.now(),
        });
        try {
          localStorage.setItem('opencad-document', newDocJson);
        } catch { /* ignore storage errors */ }
        // Also save to offline store so it persists across sessions
        void offlineSaveDocument('default', newDocJson).catch(() => {});
        return elementId;
      },

      updateElement: (elementId, updates) => {
        const { model } = get();
        if (!model) return;

        const element = model.getElementById(elementId);
        if (element) {
          Object.assign(element, updates);
          set({ document: { ...model.documentData } });
        }
      },

      deleteElement: (elementId) => {
        const { model, document } = get();
        if (!model || !document) return;

        delete document.content.elements[elementId];
        set({
          document: { ...document },
          lastSaved: Date.now(),
        });
      },

      setToolParam: (tool, key, value) => {
        const { toolParams } = get();
        set({ toolParams: { ...toolParams, [tool]: { ...(toolParams[tool] ?? {}), [key]: value } } });
      },

      setUserRole: (role) => set({ userRole: role }),

      pushHistory: (description) => {
        const { document, history, historyIndex } = get();
        if (!document) return;

        let newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
          document: JSON.parse(JSON.stringify(document)),
          timestamp: Date.now(),
          description,
        });

        // Cap history at MAX_HISTORY entries
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
          canUndo: newHistory.length > 1,
          canRedo: false,
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;

        const newIndex = historyIndex - 1;
        set({
          document: JSON.parse(JSON.stringify(history[newIndex].document)),
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true,
        });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;

        const newIndex = historyIndex + 1;
        set({
          document: JSON.parse(JSON.stringify(history[newIndex].document)),
          historyIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < history.length - 1,
        });
      },

      createVersion: (message) => {
        const { model } = get();
        if (!model) return;

        model.createVersion(message);
        set({ document: { ...model.documentData } });
      },

      restoreVersion: (versionNumber) => {
        const { model } = get();
        if (!model) return;

        model.restoreVersion(versionNumber);
        set({ document: { ...model.documentData } });
      },

      getVersionList: () => {
        const { model } = get();
        if (!model) return [];
        return model.getVersionList();
      },

      loadDocumentSchema: (schema) => {
        const { model } = get();
        if (model) {
          model.loadDocument(schema);
          set({ document: { ...model.documentData } });
        } else {
          set({ document: schema });
        }
      },

      setActiveLevel: (levelId) => {
        set({ selectedLevelId: levelId });
      },

      addLevel: (params) => {
        const { model } = get();
        if (!model) throw new Error('No document loaded');

        const levelId = model.addLevel({ name: params.name, elevation: params.elevation, height: params.height });
        set({
          document: { ...model.documentData },
          selectedLevelId: levelId,
          lastSaved: Date.now(),
        });
        return levelId;
      },

      updateLevel: (levelId, updates) => {
        const { document } = get();
        if (!document) return;
        const level = document.organization.levels[levelId];
        if (!level) return;
        Object.assign(level, updates);
        set({
          document: {
            ...document,
            organization: {
              ...document.organization,
              levels: { ...document.organization.levels, [levelId]: { ...level } },
            },
          },
        });
      },

      deleteLevel: (levelId) => {
        const { model } = get();
        if (!model) return;

        const levels = model.documentData.organization.levels;
        if (Object.keys(levels).length <= 1) return;

        delete levels[levelId];
        const remainingIds = Object.keys(levels);
        set({
          document: { ...model.documentData },
          selectedLevelId: remainingIds[0] ?? null,
          lastSaved: Date.now(),
        });
      },

      renameLevel: (levelId, name) => {
        const { model } = get();
        if (!model) return;

        const level = model.documentData.organization.levels[levelId];
        if (!level) return;
        level.name = name;
        model.documentData.metadata.updatedAt = Date.now();
        set({ document: { ...model.documentData } });
      },

      renameProject: (name) => {
        const { model } = get();
        if (!model) return;
        model.documentData.name = name;
        model.documentData.metadata.updatedAt = Date.now();
        set({ document: { ...model.documentData } });
      },
    }),
    {
      name: 'opencad-ui',
      partialize: (state) => ({ activeTool: state.activeTool }),
    }
  )
);

// ── Auto-save subscription ────────────────────────────────────────────────────
// Saves to IndexedDB 2s after any document change. Runs outside React so it
// persists even when no component is mounted. Uses the offlineStore wrapper so
// the path is mockable in tests.
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _lastAutoSaveDoc: string | null = null;

useDocumentStore.subscribe((state) => {
  const { document } = state;
  if (!document) return;
  const serialized = JSON.stringify(document);
  // Skip if unchanged
  if (serialized === _lastAutoSaveDoc) return;
  if (_autoSaveTimer !== null) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    _autoSaveTimer = null;
    _lastAutoSaveDoc = serialized;
    void offlineSaveDocument('default', serialized).catch(() => {});
  }, 2000);
});
