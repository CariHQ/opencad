import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DocumentModel, computeBoundingBox, type DocumentSchema, type ElementSchema, type PropertyValue, type PropertySet } from '@opencad/document';
import {
  saveDocument as offlineSaveDocument,
  loadDocument as offlineLoadDocument,
  listPendingSync,
  markSynced,
} from '../lib/offlineStore';
import {
  connectToProject,
  initSyncCrdt,
  crdtFlushOfflineQueue,
  setOnDocumentSync,
  setOnRemoteDelta,
  isApplyingRemote,
  type RemoteDelta,
} from '../lib/syncAdapter';
import { isFirebaseConfigured, firebaseAuth } from '../lib/firebase';
import { type RoleId } from '../config/roles';

interface HistoryEntry {
  document: DocumentSchema;
  timestamp: number;
  description: string;
}

/** T-HIST-001: A record of a single document change for the history panel. */
export interface ChangeRecord {
  id: string;
  timestamp: number;
  type: 'add' | 'update' | 'delete';
  elementId: string;
  elementType: string;
  userId: string;
}

const MAX_CHANGE_HISTORY = 200;

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

  /** T-HIST-001: Ordered list of recent change records (capped at MAX_CHANGE_HISTORY). */
  changeHistory: ChangeRecord[];

  /** T-REVIEW-001: Current design review status. */
  reviewStatus: 'none' | 'pending' | 'approved' | 'changes_requested';
  setReviewStatus: (status: 'none' | 'pending' | 'approved' | 'changes_requested') => void;

  initProject: (projectId: string, userId: string) => void;
  loadProject: (projectId: string, userId: string) => void;
  closeProject: () => void;
  setSelectedIds: (ids: string[]) => void;
  setActiveTool: (tool: string) => void;
  setOnlineStatus: (online: boolean) => void;

  addLayer: (params: { name: string; color: string }) => string;
  updateLayer: (layerId: string, updates: Record<string, unknown>) => void;
  deleteLayer: (layerId: string) => void;

  addElement: (params: {
    type: string;
    layerId: string;
    geometry?: { type: string; data: unknown };
    properties?: Record<string, unknown>;
  }) => string;
  updateElement: (elementId: string, updates: Record<string, unknown>) => void;
  deleteElement: (elementId: string) => void;
  setElementMaterial: (elementId: string, materialId: string) => void;

  setToolParam: (tool: string, key: string, value: unknown) => void;

  addPset: (elementId: string, pset: { name: string; properties: Record<string, string | number | boolean> }) => void;
  updatePsetProperty: (elementId: string, psetId: string, key: string, value: unknown) => void;
  removePset: (elementId: string, psetId: string) => void;

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

      reviewStatus: 'none' as const,
      setReviewStatus: (status) => set({ reviewStatus: status }),

      toolParams: {
        wall: { height: 3000, thickness: 200, material: 'Concrete', wallType: 'interior' },
        door: { height: 2100, width: 900, swing: 90 },
        window: { height: 1200, width: 1200, sillHeight: 900 },
      },

      changeHistory: [],

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

        // Initialise the CRDT WASM module (no-op if already loaded) then
        // connect to the real-time sync relay with an authenticated token.
        void initSyncCrdt().then(() => {
          connectToProject(
            projectId,
            isFirebaseConfigured
              ? () => {
                  const auth = firebaseAuth();
                  return auth.currentUser
                    ? auth.currentUser.getIdToken()
                    : Promise.resolve(null);
                }
              : undefined,
          );
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

        // Initialise the CRDT WASM module (no-op if already loaded) then
        // connect to the real-time sync relay with an authenticated token.
        void initSyncCrdt().then(() => {
          connectToProject(
            projectId,
            isFirebaseConfigured
              ? () => {
                  const auth = firebaseAuth();
                  return auth.currentUser
                    ? auth.currentUser.getIdToken()
                    : Promise.resolve(null);
                }
              : undefined,
          );
        });
      },

      /** Clear the active document so the ProjectHomeScreen is shown. */
      closeProject: () => {
        set({
          document: null,
          model: null,
          selectedIds: [],
          activeTool: 'select',
          history: [],
          historyIndex: -1,
          canUndo: false,
          canRedo: false,
          lastSaved: null,
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
          crdtFlushOfflineQueue();
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
        const { model, changeHistory } = get();
        if (!model) throw new Error('No document loaded');

        const props = (params.properties || {}) as Record<string, PropertyValue>;
        const elementId = model.addElement({
          type: params.type as 'wall' | 'door' | 'window' | 'slab',
          layerId: params.layerId,
          geometry: params.geometry as import('@opencad/document').ElementGeometry | undefined,
          properties: props,
        });

        // Compute bounding box from element properties
        const createdEl = model.documentData.content.elements[elementId];
        if (createdEl) {
          createdEl.boundingBox = computeBoundingBox(params.type, props);
          // Apply optional geometry override (e.g. text tool, spline curves)
          if (params.geometry) {
            createdEl.geometry = params.geometry as typeof createdEl.geometry;
          }
        }

        const newDoc = { ...model.documentData };
        const newDocJson = JSON.stringify(newDoc);
        const addRecord: ChangeRecord = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'add',
          elementId,
          elementType: params.type,
          userId: model.client,
        };
        set({
          document: newDoc,
          lastSaved: Date.now(),
          changeHistory: [...changeHistory, addRecord].slice(-MAX_CHANGE_HISTORY),
        });
        try {
          localStorage.setItem('opencad-document', newDocJson);
        } catch { /* ignore storage errors */ }
        // Also save to offline store so it persists across sessions
        void offlineSaveDocument('default', newDocJson).catch(() => {});
        return elementId;
      },

      updateElement: (elementId, updates) => {
        const { model, changeHistory } = get();
        if (!model) return;

        const element = model.getElementById(elementId);
        if (element) {
          const updateRecord: ChangeRecord = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'update',
            elementId,
            elementType: element.type ?? 'unknown',
            userId: model.client,
          };
          Object.assign(element, updates);
          set({
            document: { ...model.documentData },
            changeHistory: [...changeHistory, updateRecord].slice(-MAX_CHANGE_HISTORY),
          });
        }
      },

      deleteElement: (elementId) => {
        const { model, document, changeHistory } = get();
        if (!model || !document) return;

        const deletedEl = document.content.elements[elementId];
        const deleteRecord: ChangeRecord = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'delete',
          elementId,
          elementType: deletedEl?.type ?? 'unknown',
          userId: model.client,
        };
        delete document.content.elements[elementId];
        set({
          document: { ...document },
          lastSaved: Date.now(),
          changeHistory: [...changeHistory, deleteRecord].slice(-MAX_CHANGE_HISTORY),
        });
      },

      setElementMaterial: (elementId, materialId) => {
        const { model } = get();
        if (!model) return;
        const element = model.getElementById(elementId);
        if (!element) return;
        if (!element.properties) element.properties = {};
        (element.properties as Record<string, unknown>)['MaterialId'] = { type: 'string', value: materialId };
        set({ document: { ...model.documentData } });
      },

      setToolParam: (tool, key, value) => {
        const { toolParams } = get();
        set({ toolParams: { ...toolParams, [tool]: { ...(toolParams[tool] ?? {}), [key]: value } } });
      },

      addPset: (elementId, pset) => {
        const { model } = get();
        if (!model) return;
        const element = model.getElementById(elementId);
        if (!element) return;
        const newPset: PropertySet = {
          id: crypto.randomUUID(),
          name: pset.name,
          properties: Object.fromEntries(
            Object.entries(pset.properties).map(([k, v]) => [
              k,
              {
                type: (typeof v === 'boolean' ? 'boolean' : typeof v === 'number' ? 'number' : 'string') as 'boolean' | 'number' | 'string',
                value: v,
              },
            ])
          ),
        };
        element.propertySets = [...(element.propertySets ?? []), newPset];
        set({ document: { ...model.documentData } });
      },

      updatePsetProperty: (elementId, psetId, key, value) => {
        const { model } = get();
        if (!model) return;
        const element = model.getElementById(elementId);
        if (!element) return;
        const typedValue = value as string | number | boolean | string[];
        element.propertySets = (element.propertySets ?? []).map((pset: PropertySet) => {
          if (pset.id !== psetId) return pset;
          const existing = pset.properties[key];
          const type = existing?.type ?? (typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string');
          return {
            ...pset,
            properties: {
              ...pset.properties,
              [key]: { type, value: typedValue },
            },
          };
        });
        set({ document: { ...model.documentData } });
      },

      removePset: (elementId, psetId) => {
        const { model } = get();
        if (!model) return;
        const element = model.getElementById(elementId);
        if (!element) return;
        element.propertySets = (element.propertySets ?? []).filter((pset: PropertySet) => pset.id !== psetId);
        set({ document: { ...model.documentData } });
      },

      setUserRole: (role) => set({ userRole: role }),

      pushHistory: (description) => {
        const MAX_HISTORY = 50;
        const { document, history, historyIndex } = get();
        if (!document) return;

        let newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
          document: JSON.parse(JSON.stringify(document)),
          timestamp: Date.now(),
          description,
        });

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
        const existing = get().model;
        const userId = existing ? existing.documentData.metadata.createdBy : 'user-1';
        const newModel = new DocumentModel(schema.id, userId);
        newModel.loadDocument(schema);
        set({
          document: { ...newModel.documentData },
          model: newModel,
          lastSaved: Date.now(),
          history: [],
          historyIndex: -1,
          canUndo: false,
          canRedo: false,
        });
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
        const newDoc = { ...model.documentData };
        set({ document: newDoc });
        try {
          localStorage.setItem('opencad-document', JSON.stringify(newDoc));
        } catch { /* ignore storage errors */ }
      },
    }),
    {
      name: 'opencad-ui',
      partialize: (state) => ({ activeTool: state.activeTool }),
    }
  )
);

// ── Module-level CRDT callback registration ───────────────────────────────────
// Registered once at module load so that sync events from the WebSocket relay
// are applied to the store regardless of which component is mounted.

setOnDocumentSync((data: string) => {
  try {
    const schema = JSON.parse(data) as DocumentSchema;
    const { document, loadDocumentSchema } = useDocumentStore.getState();
    const hasLocalContent =
      document ? Object.keys(document.content?.elements ?? {}).length > 0 : false;
    if (!hasLocalContent) {
      loadDocumentSchema(schema);
    }
  } catch { /* ignore malformed sync data */ }
});

setOnRemoteDelta((delta: RemoteDelta) => {
  if (isApplyingRemote()) return;
  const { document } = useDocumentStore.getState();
  if (!document) return;

  switch (delta.op) {
    case 'set': {
      document.content.elements[delta.elementId] = {
        ...(document.content.elements[delta.elementId] ?? {}),
        ...(delta.value as Partial<ElementSchema>),
      } as ElementSchema;
      useDocumentStore.setState({ document: { ...document } });
      break;
    }
    case 'setprop': {
      const el = document.content.elements[delta.elementId];
      if (!el) return;
      (el as unknown as Record<string, unknown>)[delta.prop] = delta.value;
      useDocumentStore.setState({ document: { ...document } });
      break;
    }
    case 'delete': {
      delete document.content.elements[delta.elementId];
      useDocumentStore.setState({ document: { ...document } });
      break;
    }
  }
});
