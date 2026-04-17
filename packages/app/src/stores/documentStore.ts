import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DocumentModel,
  type DocumentSchema,
  type PropertyValue,
  loadProject as idbLoadProject,
  saveProject as idbSaveProject,
} from '@opencad/document';
import { isTauri, tauriLoadProject } from '../hooks/useTauri';

const MAX_HISTORY = 50;

// Unified debounced save — writes to localStorage AND IndexedDB on every mutation.
// Using a single debounce timer means rapid changes (dragging, typing) coalesce
// into one write 500 ms after the last change.
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(projectId: string | null, doc: DocumentSchema): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const key = projectId ? `opencad-doc-${projectId}` : 'opencad-document';
    try { localStorage.setItem(key, JSON.stringify(doc)); } catch { /* storage quota exceeded */ }
    // IndexedDB is authoritative on load — keep it in sync too
    void idbSaveProject(doc).catch(() => { /* IDB unavailable; localStorage already saved */ });
    _saveTimer = null;
  }, 500);
}

interface HistoryEntry {
  document: DocumentSchema;
  timestamp: number;
  description: string;
}

interface DocumentState {
  document: DocumentSchema | null;
  model: DocumentModel | null;
  currentProjectId: string | null;
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
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      document: null,
      model: null,
      currentProjectId: null,
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

      toolParams: {
        wall: { height: 3000, thickness: 200, material: 'Concrete', wallType: 'interior' },
        door: { height: 2100, width: 900, swing: 90 },
        window: { height: 1200, width: 1200, sillHeight: 900 },
      },

      initProject: (projectId, userId) => {
        const storageKey = `opencad-doc-${projectId}`;

        const applyDocData = (saved: string | null) => {
          let model: DocumentModel;
          try {
            if (saved) {
              const docData = JSON.parse(saved);
              if (docData?.content && docData?.organization) {
                model = new DocumentModel(projectId, userId);
                model.loadDocument(docData);
              } else {
                model = new DocumentModel(projectId, userId);
              }
            } else {
              model = new DocumentModel(projectId, userId);
            }
          } catch {
            model = new DocumentModel(projectId, userId);
          }
          set({
            document: model.documentData,
            model,
            currentProjectId: projectId,
            lastSaved: Date.now(),
            history: [],
            historyIndex: -1,
            canUndo: false,
            canRedo: false,
          });
        };

        if (isTauri()) {
          // Async: load from SQLite on desktop
          void tauriLoadProject(projectId).then((data) => {
            applyDocData(data);
          }).catch(() => {
            applyDocData(null);
          });
        } else {
          // Browser: try IndexedDB first (most reliable), fall back to localStorage
          void idbLoadProject(projectId).then((schema) => {
            if (schema) {
              // IndexedDB had data — use it directly
              const model2 = new DocumentModel(schema.id, userId);
              model2.loadDocument(schema);
              set({
                document: model2.documentData,
                model: model2,
                currentProjectId: schema.id,
                lastSaved: Date.now(),
                history: [],
                historyIndex: -1,
                canUndo: false,
                canRedo: false,
              });
            } else {
              // Fall back to localStorage (with legacy key migration)
              let saved = localStorage.getItem(storageKey);
              if (!saved) {
                const legacy = localStorage.getItem('opencad-document');
                if (legacy) {
                  try {
                    const docData = JSON.parse(legacy);
                    if (docData?.content && docData?.organization) {
                      localStorage.setItem(storageKey, legacy);
                      saved = legacy;
                    }
                  } catch { /* ignore */ }
                  localStorage.removeItem('opencad-document');
                }
              }
              applyDocData(saved);
            }
          }).catch(() => {
            // IndexedDB unavailable — use localStorage
            let saved = localStorage.getItem(storageKey);
            if (!saved) {
              const legacy = localStorage.getItem('opencad-document');
              if (legacy) {
                try {
                  const docData = JSON.parse(legacy);
                  if (docData?.content && docData?.organization) {
                    localStorage.setItem(storageKey, legacy);
                    saved = legacy;
                  }
                } catch { /* ignore */ }
                localStorage.removeItem('opencad-document');
              }
            }
            applyDocData(saved);
          });
        }
      },

      loadProject: (projectId, userId) => {
        const model = new DocumentModel(projectId, userId);
        const document = model.documentData;

        set({
          document,
          model,
          currentProjectId: projectId,
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
        const { model } = get();
        if (model) {
          model.setOnlineStatus(online);
        }
        set({ isOnline: online });
      },

      addLayer: (params) => {
        const { model, currentProjectId } = get();
        if (!model) throw new Error('No document loaded');

        const layerId = model.addLayer(params);
        const newDoc = { ...model.documentData };
        set({ document: newDoc, lastSaved: Date.now() });
        debouncedSave(currentProjectId, newDoc);
        return layerId;
      },

      updateLayer: (layerId, updates) => {
        const { model, currentProjectId } = get();
        if (!model) return;

        model.updateLayer(layerId, updates as Record<string, unknown>);
        const newDoc = { ...model.documentData };
        set({ document: newDoc });
        debouncedSave(currentProjectId, newDoc);
      },

      deleteLayer: (layerId) => {
        const { model, currentProjectId } = get();
        if (!model) return;

        model.deleteLayer(layerId);
        const newDoc = { ...model.documentData };
        set({ document: newDoc });
        debouncedSave(currentProjectId, newDoc);
      },

      addElement: (params) => {
        const { model, currentProjectId } = get();
        if (!model) throw new Error('No document loaded');

        const elementId = model.addElement({
          type: params.type as 'wall' | 'door' | 'window' | 'slab',
          layerId: params.layerId,
          properties: params.properties as Record<string, PropertyValue>,
        });

        const newDoc = { ...model.documentData };
        set({ document: newDoc, lastSaved: Date.now() });
        debouncedSave(currentProjectId, newDoc);
        return elementId;
      },

      updateElement: (elementId, updates) => {
        const { model, currentProjectId } = get();
        if (!model) return;

        const element = model.getElementById(elementId);
        if (element) {
          const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
          const safeUpdates = Object.fromEntries(
            Object.entries(updates as Record<string, unknown>).filter(([k]) => !FORBIDDEN.has(k))
          );
          const updatedElement = { ...element, ...safeUpdates };
          model.documentData.content.elements[elementId] = updatedElement as typeof element;
          const newDoc = { ...model.documentData };
          set({ document: newDoc });
          debouncedSave(currentProjectId, newDoc);
        }
      },

      deleteElement: (elementId) => {
        const { model, document, currentProjectId } = get();
        if (!model || !document) return;

        delete document.content.elements[elementId];
        const newDoc = { ...document };
        set({ document: newDoc, lastSaved: Date.now() });
        debouncedSave(currentProjectId, newDoc);
      },

      setToolParam: (tool, key, value) => {
        const { toolParams } = get();
        set({ toolParams: { ...toolParams, [tool]: { ...(toolParams[tool] ?? {}), [key]: value } } });
      },

      pushHistory: (description) => {
        const { document, history, historyIndex } = get();
        if (!document) return;

        let newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({
          document: JSON.parse(JSON.stringify(document)),
          timestamp: Date.now(),
          description,
        });
        // Cap history depth to avoid unbounded memory growth
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
        const { history, historyIndex, currentProjectId } = get();
        if (historyIndex <= 0) return;

        const newIndex = historyIndex - 1;
        const restoredDoc = JSON.parse(JSON.stringify(history[newIndex].document)) as DocumentSchema;
        set({ document: restoredDoc, historyIndex: newIndex, canUndo: newIndex > 0, canRedo: true });
        debouncedSave(currentProjectId, restoredDoc);
      },

      redo: () => {
        const { history, historyIndex, currentProjectId } = get();
        if (historyIndex >= history.length - 1) return;

        const newIndex = historyIndex + 1;
        const restoredDoc = JSON.parse(JSON.stringify(history[newIndex].document)) as DocumentSchema;
        set({ document: restoredDoc, historyIndex: newIndex, canUndo: true, canRedo: newIndex < history.length - 1 });
        debouncedSave(currentProjectId, restoredDoc);
      },

      createVersion: (message) => {
        const { model, currentProjectId } = get();
        if (!model) return;

        model.createVersion(message);
        const newDoc = { ...model.documentData };
        set({ document: newDoc });
        debouncedSave(currentProjectId, newDoc);
      },

      restoreVersion: (versionNumber) => {
        const { model, currentProjectId } = get();
        if (!model) return;

        model.restoreVersion(versionNumber);
        const newDoc = { ...model.documentData };
        set({ document: newDoc });
        debouncedSave(currentProjectId, newDoc);
      },

      getVersionList: () => {
        const { model } = get();
        return model?.getVersionList() ?? [];
      },

      loadDocumentSchema: (schema) => {
        const existing = get().model;
        const userId = existing ? existing.documentData.metadata.createdBy : 'user-1';
        const newModel = new DocumentModel(schema.id, userId);
        newModel.loadDocument(schema);
        const newDoc = { ...newModel.documentData };
        set({
          document: newDoc,
          model: newModel,
          currentProjectId: schema.id,
          lastSaved: Date.now(),
          history: [],
          historyIndex: -1,
          canUndo: false,
          canRedo: false,
        });
        debouncedSave(schema.id, newDoc);
      },

      setActiveLevel: (levelId) => {
        set({ selectedLevelId: levelId });
      },

      addLevel: (params) => {
        const { model, currentProjectId } = get();
        if (!model) throw new Error('No document loaded');

        const levelId = model.addLevel({ name: params.name, elevation: params.elevation, height: params.height });
        const newDoc = { ...model.documentData };
        set({ document: newDoc, selectedLevelId: levelId, lastSaved: Date.now() });
        debouncedSave(currentProjectId, newDoc);
        return levelId;
      },

      updateLevel: (levelId, updates) => {
        const { document, currentProjectId } = get();
        if (!document) return;
        const level = document.organization.levels[levelId];
        if (!level) return;
        Object.assign(level, updates);
        const newDoc = {
          ...document,
          organization: {
            ...document.organization,
            levels: { ...document.organization.levels, [levelId]: { ...level } },
          },
        };
        set({ document: newDoc });
        debouncedSave(currentProjectId, newDoc);
      },

      deleteLevel: (levelId) => {
        const { model, currentProjectId } = get();
        if (!model) return;

        const levels = model.documentData.organization.levels;
        if (Object.keys(levels).length <= 1) return;

        delete levels[levelId];
        const remainingIds = Object.keys(levels);
        const newDoc = { ...model.documentData };
        set({ document: newDoc, selectedLevelId: remainingIds[0] ?? null, lastSaved: Date.now() });
        debouncedSave(currentProjectId, newDoc);
      },

      renameLevel: (levelId, name) => {
        const { model, currentProjectId } = get();
        if (!model) return;

        const level = model.documentData.organization.levels[levelId];
        if (!level) return;
        level.name = name;
        model.documentData.metadata.updatedAt = Date.now();
        const newDoc = { ...model.documentData };
        set({ document: newDoc });
        debouncedSave(currentProjectId, newDoc);
      },
    }),
    {
      name: 'opencad-ui',
      partialize: (state) => ({ activeTool: state.activeTool }),
    }
  )
);
